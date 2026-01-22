import {
  type CreatedReplaySessionSubscription,
  type StartedTaskSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

import { generateName } from "@/renaming/ai";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

export const setupRenaming = (sdk: FrontendSDK) => {
  const settingsStore = useSettingsStore();

  const renameSession = async (entryId: string, sessionId: string) => {
    const nameResult = await generateName(sdk, await sdk.graphql.replayEntry({ id: entryId }));
    if (nameResult.kind === "Error") {
      sdk.window.showToast(`[Shift] Failed while renaming session: ${nameResult.error}`, {
        variant: "error",
      });
      return;
    }

    await renameTab(sdk, sessionId, nameResult.value);
  };

  const handleStartedTask = async (result: StartedTaskSubscription) => {
    const task = result.startedTask.task;
    if (task.__typename !== "ReplayTask") return;

    const renaming = settingsStore.renaming;
    if (!renaming) return;

    const isRenamingEnabled = renaming.enabled;
    const isRenameAfterSend = renaming.renameAfterSend;
    if (!isRenamingEnabled || !isRenameAfterSend) return;

    const entryId = task.replayEntry?.id;
    const sessionId = task.replayEntry?.session.id;
    if (!isPresent(entryId) || !isPresent(sessionId)) return;

    await renameSession(entryId, sessionId);
  };
  const handleCreatedReplaySession = async (result: CreatedReplaySessionSubscription) => {
    const renaming = settingsStore.renaming;
    if (!renaming) return;

    const isRenamingEnabled = renaming.enabled;
    if (!isRenamingEnabled) return;

    const entryId = result.createdReplaySession.sessionEdge.node.activeEntry?.id;
    const sessionId = result.createdReplaySession.sessionEdge.node.id;
    if (!isPresent(entryId) || !isPresent(sessionId)) return;

    await renameSession(entryId, sessionId);
  };

  const subscribeToStartedTask = async () => {
    for await (const result of sdk.graphql.startedTask()) {
      handleStartedTask(result);
    }
  };

  const subscribeToCreatedReplaySession = async () => {
    for await (const result of sdk.graphql.createdReplaySession()) {
      handleCreatedReplaySession(result);
    }
  };

  subscribeToStartedTask();
  subscribeToCreatedReplaySession();
};

const isSending = () =>
  document.querySelector("[aria-label='Cancel']") !== null && location.hash === "#/replay";

const renameTab = async (sdk: FrontendSDK, id: string, name: string) => {
  const startTime = Date.now();
  const timeout = 15000;

  while (isSending()) {
    if (Date.now() - startTime > timeout) {
      sdk.window.showToast("[Shift] Timeout while waiting for sending to finish", {
        variant: "warning",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await sdk.replay.renameSession(id, name);
};
