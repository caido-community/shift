import {
  type CreatedReplaySessionSubscription,
  type UpdatedReplaySessionSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

import { type CustomPrompt } from "@/agents/types";
import { LaunchInputDialog } from "@/components/inputDialog";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";
const SHIFT_COLLECTION_NAME = "Shift";
const DEFAULT_SHIFT_MESSAGE =
  "Shift agent auto-launched from the Shift collection. Proceed with testing.";

export const ensureShiftCollection = async (sdk: FrontendSDK) => {
  try {
    const configStore = useConfigStore();
    const collections = sdk.replay.getCollections();
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
    const handleConfirm = (payloadString: string) => {
      dialog.close();

      if (!payloadString) {
        return;
      }

      type LaunchPayload = {
        selections?: Array<{ selection: string; comment?: string }>;
        instructions?: string;
        maxInteractions?: number;
      };

      let payload: LaunchPayload | undefined;
      try {
        payload = JSON.parse(payloadString) as LaunchPayload;
      } catch {
        sdk.window.showToast(
          "[Shift] Unable to parse launch instructions. Please try again.",
          { variant: "error" },
        );
        return;
      }

      const selections = Array.isArray(payload?.selections)
        ? payload!.selections.filter(
            (entry): entry is { selection: string; comment?: string } =>
              typeof entry?.selection === "string" &&
              entry.selection.trim().length > 0,
          )
        : [];

      const instructionsText =
        typeof payload?.instructions === "string"
          ? payload.instructions.trim()
          : "";

      if (selections.length === 0 && instructionsText.length === 0) {
        return;
      }

      const requestedMaxInteractions =
        typeof payload?.maxInteractions === "number"
          ? Math.max(1, Math.floor(payload.maxInteractions))
          : undefined;

      if (
        requestedMaxInteractions !== undefined &&
        requestedMaxInteractions !== configStore.maxIterations
      ) {
        configStore.maxIterations = requestedMaxInteractions;
      }

      const formattedSelections =
        selections.length === 0
          ? ""
          : selections
              .map((entry, index) => {
                const commentLine =
                  entry.comment && entry.comment.trim().length > 0
                    ? `Comment: ${entry.comment.trim()}`
                    : "Comment: (none)";
                return `Selection ${index + 1}:\n${entry.selection}\n${commentLine}`;
              })
              .join("\n\n");

      const messageSections: string[] = [];
      if (formattedSelections.length > 0) {
        messageSections.push(`Selections:\n${formattedSelections}`);
      }
      if (instructionsText.length > 0) {
        messageSections.push(`Instructions:\n${instructionsText}`);
      }

      const messageBody = messageSections.join("\n\n").trim();

      // Launch the agent with the JIT instructions
      (async () => {
        try {
          await agentsStore.addAgent(sessionId);
          await agentsStore.selectAgent(sessionId);
          sdk.replay.openTab(sessionId);
          // Set all selected prompts for this agent
          const uiStore = useUIStore();
          const promptIds = prompts.map((prompt) => prompt.id);
          uiStore.setSelectedPrompts(sessionId, promptIds);

          await agentsStore.selectedAgent?.sendMessage({
            text: messageBody,
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

    try {
      const entry = await agentsStore.addAgent(sessionId);
      await agentsStore.selectAgent(sessionId);
      sdk.replay.openTab(sessionId);

      if (prompts.length > 0) {
        const uiStore = useUIStore();
        const promptIds = prompts.map((prompt) => prompt.id);
        uiStore.setSelectedPrompts(sessionId, promptIds);
      }

      const message =
        collectionName === SHIFT_COLLECTION_NAME && prompts.length === 0
          ? DEFAULT_SHIFT_MESSAGE
          : "Proceed with testing.";

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
};
