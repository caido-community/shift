import { watch, type WatchStopHandle } from "vue";

import { BackgroundAgentsPanel } from "@/components/backgroundAgents";
import { mountShiftApp } from "@/dom/utils";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";

export const useBackgroundAgentsPanelManager = (sdk: FrontendSDK) => {
  let unmount: (() => void) | undefined;
  let stopWatching: WatchStopHandle | undefined;

  const remove = () => {
    unmount?.();
    unmount = undefined;
  };

  const start = () => {
    if (stopWatching !== undefined) {
      return;
    }

    const settingsStore = useSettingsStore();
    stopWatching = watch(
      () => settingsStore.isFeatureEnabled("backgroundAgents"),
      (enabled) => {
        if (enabled) {
          unmount ??= mountShiftApp(sdk, BackgroundAgentsPanel);
        } else {
          remove();
        }
      },
      { immediate: true }
    );
  };

  const stop = () => {
    stopWatching?.();
    stopWatching = undefined;
    remove();
  };

  return {
    start,
    stop,
  };
};
