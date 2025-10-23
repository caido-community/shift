import {
  type CreatedReplaySessionSubscription,
  type StartedTaskSubscription,
  type UpdatedReplaySessionSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

import { generateName } from "@/renaming/ai";
import { type CustomPrompt } from "@/agents/types";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";

export const setupRenaming = (sdk: FrontendSDK) => {
  const configStore = useConfigStore();

  const handleStartedTask = async (result: StartedTaskSubscription) => {
    if (result.startedTask.task.__typename !== "ReplayTask") return;
    if (
      !configStore.aiSessionRenaming.enabled ||
      !configStore.aiSessionRenaming.renameAfterSend
    )
      return;

    const entryId = result.startedTask.task.replayEntry?.id;
    if (!entryId) return;

    try {
      const replayEntry = await sdk.graphql.replayEntry({ id: entryId });
      const name = await generateName(replayEntry);

      const sessionId = result.startedTask.task.replayEntry?.session.id;
      await renameTab(sdk, sessionId, name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Something went wrong while renaming the tab: ${errorMessage}`,
        {
          variant: "error",
        },
      );
    }
  };

  const handleCreatedReplaySession = async (
    result: CreatedReplaySessionSubscription,
  ) => {
    if (!configStore.aiSessionRenaming.enabled) return;

    const { createdReplaySession: data } = result;

    const entryId = data.sessionEdge.node.activeEntry?.id;
    if (entryId === undefined) return;

    try {
      const replayEntry = await sdk.graphql.replayEntry({ id: entryId });
      const name = await generateName(replayEntry);

      await renameTab(sdk, data.sessionEdge.node.id, name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Something went wrong while renaming the tab: ${errorMessage}`,
        {
          variant: "error",
        },
      );
    }
  };

  const subscribeToStartedTask = async () => {
    const startedTask = sdk.graphql.startedTask();
    for await (const result of startedTask) {
      handleStartedTask(result);
    }
  };

  const subscribeToCreatedReplaySession = async () => {
    const createdReplaySession = sdk.graphql.createdReplaySession();
    for await (const result of createdReplaySession) {
      handleCreatedReplaySession(result);
    }
  };

  subscribeToStartedTask();
  subscribeToCreatedReplaySession();
};

const isSending = () => {
  return (
    document.querySelector("[aria-label='Cancel']") !== null &&
    location.hash === "#/replay"
  );
};

// Renaming tab while request is being sent breaks stuff, this makes the rename call wait until sending is finished
const renameTab = async (sdk: FrontendSDK, id: string, name: string) => {
  const startTime = Date.now();
  const timeout = 15000;

  while (isSending()) {
    if (Date.now() - startTime > timeout) {
      sdk.window.showToast(
        "[Shift] Timeout while waiting for sending to finish",
        { variant: "warning" }
      );
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await sdk.replay.renameSession(id, name);
};

export const setupReplayCollectionCorrelation = (sdk: FrontendSDK) => {
  const configStore = useConfigStore();
  const agentsStore = useAgentsStore();

  // Track the last known collection ID for each replay session so we can
  // detect moves between collections on update events.
  const sessionToCollectionId = new Map<string, string | undefined>();

  const showJitInstructionDialog = async (sessionId: string, collectionName: string, prompts: CustomPrompt[]) => {
    // For now, use a simple prompt - in a real implementation, you'd want a proper dialog
    const instruction = window.prompt(
      `Enter instructions for replay session in collection "${collectionName}":`
    );

    if (instruction && instruction.trim() !== "") {
      // Launch the agent with the JIT instructions
      try {
        await agentsStore.addAgent(sessionId);
        await agentsStore.selectAgent(sessionId);
        
        // Set all selected prompts for this agent
        const uiStore = useUIStore();
        const promptIds = prompts.map(prompt => prompt.id);
        uiStore.setSelectedPrompts(sessionId, promptIds);
        
        await agentsStore.selectedAgent?.sendMessage({
          text: instruction,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sdk.window.showToast(
          `[Shift] Failed to launch agent with JIT instructions: ${errorMessage}`,
          { variant: "error" }
        );
      }
    }
  };

  const findPromptsByCollectionName = (collectionName: string) => {
    return configStore.customPrompts.filter(
      prompt => prompt.autoExecuteCollection === collectionName
    );
  };

  const handleUpdatedReplaySession = async (
    result: UpdatedReplaySessionSubscription,
  ) => {
    const { updatedReplaySession: data } = result;
    const session = data.sessionEdge.node;

    const previousCollectionId = sessionToCollectionId.get(session.id);
    const nextCollectionId = session.collection?.id;

    // If nothing changed, do nothing.
    if (previousCollectionId === nextCollectionId) return;

    try {
      // Always update our local state, even if we bail early below.
      sessionToCollectionId.set(session.id, nextCollectionId);

      // Only act when a session moves into a collection (next exists) and that
      // collection is correlated with a Shift Agent.
      if (!nextCollectionId) return;

      const collections = await sdk.replay.getCollections();
      const collection = collections.find((col: any) => col.id === nextCollectionId);
      const collectionName = collection?.name;
      if (!collectionName) return;

      const prompts = findPromptsByCollectionName(collectionName);
      if (prompts.length === 0) return;

      // Check if any prompt requires JIT instructions
      const jitPrompt = prompts.find(prompt => prompt.promptForJitInstructions);
      if (jitPrompt) {
        await showJitInstructionDialog(session.id, collectionName, prompts);
      } else {
        try {
          await agentsStore.addAgent(session.id);
          await agentsStore.selectAgent(session.id);
          
          // Set all selected prompts for this agent
          const uiStore = useUIStore();
          const promptIds = prompts.map(prompt => prompt.id);
          uiStore.setSelectedPrompts(session.id, promptIds);
          
          await agentsStore.selectedAgent?.sendMessage({
            text: "Proceed with testing.",
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          sdk.window.showToast(
            `[Shift] Failed to launch agent: ${errorMessage}`,
            { variant: "error" }
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error handling updated replay session: ${errorMessage}`,
        { variant: "error" }
      );
    }
  };

  const handleCreatedReplaySessionForCorrelation = async (
    result: CreatedReplaySessionSubscription,
  ) => {
    const { createdReplaySession: data } = result;
    const session = data.sessionEdge.node;
    const collectionId = session.collection?.id;
    
    // Seed our local state with the initial collection for this session.
    sessionToCollectionId.set(session.id, collectionId);

    if (!collectionId) return;

    try {
      // Get collection details to find the name
      const collections = await sdk.replay.getCollections();
      const collection = collections.find((col: any) => col.id === collectionId);
      const collectionName = collection?.name;
      
      if (!collectionName) return;

      // Find prompts by collection name
      const prompts = findPromptsByCollectionName(collectionName);

      if (prompts.length === 0) return;

      // Check if any prompt requires JIT instructions
      const jitPrompt = prompts.find(prompt => prompt.promptForJitInstructions);
      if (jitPrompt) {
        await showJitInstructionDialog(session.id, collectionName, prompts);
      } else {
        // Launch agent without JIT instructions
        try {
          await agentsStore.addAgent(session.id);
          await agentsStore.selectAgent(session.id);
          
          // Set all selected prompts for this agent
          const uiStore = useUIStore();
          const promptIds = prompts.map(prompt => prompt.id);
          uiStore.setSelectedPrompts(session.id, promptIds);
          
          await agentsStore.selectedAgent?.sendMessage({
            text: "Proceed with testing.",
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          sdk.window.showToast(
            `[Shift] Failed to launch agent: ${errorMessage}`,
            { variant: "error" }
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error checking collection correlation: ${errorMessage}`,
        { variant: "error" }
      );
    }
  };

  const subscribeToCreatedReplaySession = async () => {
    try {
      const createdReplaySession = sdk.graphql.createdReplaySession();
      for await (const result of createdReplaySession) {
        handleCreatedReplaySessionForCorrelation(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error subscribing to createdReplaySession: ${errorMessage}`,
        { variant: "error" }
      );
    }
  };

  const subscribeToUpdatedReplaySession = async () => {
    try {
      const updatedReplaySession = sdk.graphql.updatedReplaySession({});
      for await (const result of updatedReplaySession) {
        handleUpdatedReplaySession(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error subscribing to updatedReplaySession: ${errorMessage}`,
        { variant: "error" }
      );
    }
  };

  subscribeToCreatedReplaySession();
  subscribeToUpdatedReplaySession();
};
