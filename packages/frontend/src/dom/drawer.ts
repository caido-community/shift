import { AgentSidebar } from "@/components/agent";
import { mountShiftApp, watchReplayPage } from "@/dom/utils";
import { type FrontendSDK } from "@/types";

export const useDrawerManager = (sdk: FrontendSDK) => {
  let unmount: (() => void) | undefined;
  let stopWatching: (() => void) | undefined;

  const inject = () => {
    unmount ??= mountShiftApp(sdk, AgentSidebar);
  };

  const remove = () => {
    unmount?.();
    unmount = undefined;
  };

  return {
    start: () => {
      stopWatching ??= watchReplayPage(sdk, inject, remove);
    },
    stop: () => {
      stopWatching?.();
      stopWatching = undefined;
      remove();
    },
  };
};
