import { generateName } from "@/renaming/ai";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { getReplayEntryRequest } from "@/utils/caido";
import { isPresent } from "@/utils/optional";

export const setupRenaming = (sdk: FrontendSDK) => {
  const settingsStore = useSettingsStore();

  const renameSession = async (
    entryId: string | undefined,
    sessionId: string | undefined,
    afterSend: boolean
  ) => {
    const renaming = settingsStore.config.renaming;
    if (!renaming.enabled || (afterSend && !renaming.renameAfterSend)) return;
    if (!isPresent(entryId) || !isPresent(sessionId)) return;

    try {
      const entryResult = await getReplayEntryRequest(sdk, entryId, sessionId);
      if (entryResult.kind === "Error") {
        sdk.window.showToast(`[Shift] Failed while fetching replay entry: ${entryResult.error}`, {
          variant: "error",
        });
        return;
      }

      const nameResult = await generateName(sdk, entryResult.value);
      if (nameResult.kind === "Error") {
        sdk.window.showToast(`[Shift] Failed while renaming session: ${nameResult.error}`, {
          variant: "error",
        });
        return;
      }

      await renameTab(sdk, sessionId, nameResult.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(`[Shift] Failed while renaming session: ${message}`, {
        variant: "error",
      });
    }
  };

  void (async () => {
    for await (const { startedTask } of sdk.graphql.startedTask()) {
      const task = startedTask.task;
      if (task.__typename === "ReplayTask") {
        void renameSession(task.replayEntry?.id, task.replayEntry?.session.id, true);
      }
    }
  })();

  void (async () => {
    for await (const { createdReplaySession } of sdk.graphql.createdReplaySession()) {
      const session = createdReplaySession.sessionEdge.node;
      void renameSession(session.activeEntry?.id, session.id, false);
    }
  })();
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
