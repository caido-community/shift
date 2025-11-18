import {
  type CreatedReplaySessionSubscription,
  type UpdatedReplaySessionSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

import {
  type AgentRuntimeConfigInput,
  type CustomPrompt,
} from "@/agents/types";
import { LaunchInputDialog } from "@/components/inputDialog";
import type { LaunchInputDialogResult } from "@/components/inputDialog/launchInputDialog/types";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";
const SHIFT_COLLECTION_NAME = "Shift";

export const ensureShiftCollection = async (sdk: FrontendSDK) => {
  try {
    const configStore = useConfigStore();
    const collections = sdk.replay.getCollections();

    // If collections is empty, wait 500ms and retry
    if (collections.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return void ensureShiftCollection(sdk);
    }

    const existing = collections.find(
      (collection: { id: string; name?: string }) =>
        collection.name === SHIFT_COLLECTION_NAME,
    );

    if (existing) {
      return existing;
    }

    if (!configStore.autoCreateShiftCollection) {
      return undefined;
    }

    return await sdk.replay.createCollection(SHIFT_COLLECTION_NAME);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sdk.window.showToast(
      `[Shift] Failed to ensure Shift collection exists: ${errorMessage}`,
      { variant: "error" },
    );
    return undefined;
  }
};

export const setupReplayCollectionCorrelation = (sdk: FrontendSDK) => {
  const configStore = useConfigStore();
  const agentsStore = useAgentsStore();

  void ensureShiftCollection(sdk);

  // Track the last known collection ID for each replay session so we can
  // detect moves between collections on update events.
  const sessionToCollectionId = new Map<string, string | undefined>();

  const showJitInstructionDialog = (
    sessionId: string,
    collectionName: string,
    prompts: CustomPrompt[],
  ) => {
    let dialog: { close: () => void } = { close: () => {} };
    const handleConfirm = (payload: LaunchInputDialogResult) => {
      dialog.close();

      const {
        selections,
        instructions,
        maxInteractions,
        selectedPromptIds,
        model,
      } = payload;

      // Convert selected prompt IDs to CustomPrompt objects
      // If user selected prompts in the dialog, use those; otherwise fall back to collection prompts
      const promptsToUse =
        selectedPromptIds && selectedPromptIds.length > 0
          ? configStore.customPrompts.filter((prompt) =>
              selectedPromptIds.includes(prompt.id),
            )
          : prompts;

      const agentOptions: AgentRuntimeConfigInput = {
        maxIterations: maxInteractions,
        selections,
        customPrompts: promptsToUse,
        model,
      };

      // Launch the agent with the JIT instructions
      (async () => {
        try {
          await agentsStore.addAgent(sessionId, agentOptions);
          await agentsStore.selectAgent(sessionId);
          sdk.replay.openTab(sessionId);
          // Set the selected prompts from the dialog (or fall back to collection prompts)
          const uiStore = useUIStore();
          const promptIds =
            selectedPromptIds && selectedPromptIds.length > 0
              ? selectedPromptIds
              : prompts.map((prompt) => prompt.id);
          uiStore.setSelectedPrompts(sessionId, promptIds);

          await agentsStore.selectedAgent?.sendMessage({
            text: instructions.trim() || "Proceed with testing.",
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sdk.window.showToast(
            `[Shift] Failed to launch agent with JIT instructions: ${errorMessage}`,
            { variant: "error" },
          );
        }
      })();
    };

    const handleCancel = () => {
      dialog.close();
    };

    dialog = sdk.window.showDialog(
      {
        component: LaunchInputDialog,
        props: {
          title: "Instructions",
          placeholder: "Enter your instructions for the agent...",
          sdk,
          onConfirm: () => handleConfirm,
          onCancel: () => handleCancel,
        },
      },
      {
        title: "Shift Agent Launch Instructions",
        closeOnEscape: true,
        closable: true,
        draggable: true,
        modal: false,
        position: "center",
      },
    );
  };

  const findPromptsByCollectionName = (collectionName: string) => {
    return configStore.customPrompts.filter((prompt) => {
      const projectAutoExecuteCollection =
        configStore.getProjectAutoExecuteCollection(prompt.id);
      return projectAutoExecuteCollection === collectionName;
    });
  };

  const shouldAutoLaunchForCollection = (collectionName: string) => {
    if (collectionName === SHIFT_COLLECTION_NAME) {
      return true;
    }
    return findPromptsByCollectionName(collectionName).length > 0;
  };

  const launchAgentForCollection = async (
    sessionId: string,
    collectionName: string,
  ) => {
    const prompts = findPromptsByCollectionName(collectionName);
    const requiresJit = prompts.find((prompt) =>
      configStore.getProjectJitInstructions(prompt.id),
    );

    if (requiresJit || collectionName === SHIFT_COLLECTION_NAME) {
      showJitInstructionDialog(sessionId, collectionName, prompts);
      return;
    }

    if (agentsStore.getAgent(sessionId) !== undefined) {
      return;
    }

    const agentOptions: AgentRuntimeConfigInput = {
      customPrompts: prompts,
    };

    try {
      const entry = await agentsStore.addAgent(sessionId, agentOptions);
      await agentsStore.selectAgent(sessionId);
      sdk.replay.openTab(sessionId);

      if (prompts.length > 0) {
        const uiStore = useUIStore();
        const promptIds = prompts.map((prompt) => prompt.id);
        uiStore.setSelectedPrompts(sessionId, promptIds);
      }

      const message = "Proceed with testing.";

      await entry.chat.sendMessage({
        text: message,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(`[Shift] Failed to launch agent: ${errorMessage}`, {
        variant: "error",
      });
    }
  };

  const handleSessionInCollection = async (
    sessionId: string,
    collectionName: string,
  ) => {
    if (!shouldAutoLaunchForCollection(collectionName)) {
      return;
    }

    await launchAgentForCollection(sessionId, collectionName);
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

      const collections = sdk.replay.getCollections();
      const collection = collections.find(
        (col: { id: string; name?: string }) => col.id === nextCollectionId,
      );
      const collectionName = collection?.name;
      if (collectionName === undefined || collectionName === "") return;

      await handleSessionInCollection(session.id, collectionName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error handling updated replay session: ${errorMessage}`,
        { variant: "error" },
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
      const collections = sdk.replay.getCollections();
      const collection = collections.find(
        (col: { id: string; name?: string }) => col.id === collectionId,
      );
      const collectionName = collection?.name;

      if (collectionName === undefined || collectionName === "") return;

      await handleSessionInCollection(session.id, collectionName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error checking collection correlation: ${errorMessage}`,
        { variant: "error" },
      );
    }
  };

  const loadCurrentSessions = () => {
    try {
      const collections = sdk.replay.getCollections();
      for (const collection of collections) {
        const { sessionIds, id } = collection ?? {};
        if (!Array.isArray(sessionIds) || typeof id !== "string") {
          continue;
        }
        for (const sessionId of sessionIds) {
          sessionToCollectionId.set(sessionId, id);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error loading current sessions: ${errorMessage}`,
        { variant: "error" },
      );
    }
  };

  const subscribeToCreatedReplaySession = async () => {
    try {
      const createdReplaySession = sdk.graphql.createdReplaySession();
      for await (const result of createdReplaySession) {
        void ensureShiftCollection(sdk);
        handleCreatedReplaySessionForCorrelation(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error subscribing to createdReplaySession: ${errorMessage}`,
        { variant: "error" },
      );
    }
  };

  const subscribeToUpdatedReplaySession = async () => {
    try {
      const updatedReplaySession = sdk.graphql.updatedReplaySession({});
      for await (const result of updatedReplaySession) {
        void ensureShiftCollection(sdk);
        handleUpdatedReplaySession(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `[Shift] Error subscribing to updatedReplaySession: ${errorMessage}`,
        { variant: "error" },
      );
    }
  };

  // Load existing sessions into sessionToCollectionId
  void loadCurrentSessions();

  subscribeToCreatedReplaySession();
  subscribeToUpdatedReplaySession();

  // Subscribe to project changes and ensure Shift collection
  sdk.projects.onCurrentProjectChange(() => {
    void ensureShiftCollection(sdk);
  });
};
