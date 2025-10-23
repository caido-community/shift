import {
  type CreatedReplaySessionSubscription,
  type UpdatedReplaySessionSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

import InputDialog from "@/components/inputDialog/Container.vue";
import { type CustomPrompt } from "@/agents/types";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";

export const setupReplayCollectionCorrelation = (sdk: FrontendSDK) => {
  const configStore = useConfigStore();
  const agentsStore = useAgentsStore();

  // Track the last known collection ID for each replay session so we can
  // detect moves between collections on update events.
  const sessionToCollectionId = new Map<string, string | undefined>();

  const showJitInstructionDialog = async (sessionId: string, collectionName: string, prompts: CustomPrompt[]) => {
    let dialog: any;

    const handleConfirm = (instruction: string) => {
      dialog.close();
      
      // If instruction is empty, user cancelled - do nothing
      if (!instruction || instruction.trim() === "") {
        return;
      }
      
      // Launch the agent with the JIT instructions
      (async () => {
        try {
          await agentsStore.addAgent(sessionId);
          await agentsStore.selectAgent(sessionId);
          sdk.replay.openTab(sessionId);
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
      })();
    };

    dialog = sdk.window.showDialog(
      {
        component: InputDialog,
        props: {
          title: ``,
          placeholder: "Enter your instructions for the agent...",
          onConfirm: () => handleConfirm,
        },
      },
      {
        closeOnEscape: true,
        closable: false,
        modal: true,
        position: "center",
        draggable: true,
      },
    );
  };

  const findPromptsByCollectionName = (collectionName: string) => {
    return configStore.customPrompts.filter(prompt => {
      const projectAutoExecuteCollection = configStore.getProjectAutoExecuteCollection(prompt.id);
      return projectAutoExecuteCollection === collectionName;
    });
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
      const jitPrompt = prompts.find(prompt => configStore.getProjectJitInstructions(prompt.id));
      if (jitPrompt) {
        await showJitInstructionDialog(session.id, collectionName, prompts);
      } else {
        try {
          await agentsStore.addAgent(session.id);
          await agentsStore.selectAgent(session.id);
          sdk.replay.openTab(session.id);
          
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
      const jitPrompt = prompts.find(prompt => configStore.getProjectJitInstructions(prompt.id));
      if (jitPrompt) {
        await showJitInstructionDialog(session.id, collectionName, prompts);
      } else {
        // Launch agent without JIT instructions
        try {
          await agentsStore.addAgent(session.id);
          await agentsStore.selectAgent(session.id);

          sdk.replay.openTab(session.id);
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
