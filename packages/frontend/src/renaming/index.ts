import {
  type CreatedReplaySessionSubscription,
  type StartedTaskSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

import { generateName } from "@/renaming/ai";
import { useConfigStore } from "@/stores/config";
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

