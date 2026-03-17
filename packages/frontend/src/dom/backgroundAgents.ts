import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { type App, createApp, watch, type WatchStopHandle } from "vue";

import { BackgroundAgentsPanel } from "@/components/backgroundAgents";
import { SDKPlugin } from "@/plugins/sdk";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";

export const useBackgroundAgentsPanelManager = (sdk: FrontendSDK) => {
  let app: App | undefined = undefined;
  let container: HTMLDivElement | undefined = undefined;
  let stopWatching: WatchStopHandle | undefined = undefined;

  const mount = () => {
    if (app !== undefined) {
      return;
    }

    container = document.createElement("div");
    container.id = "plugin--shift";
    document.body.appendChild(container);

    app = createApp(BackgroundAgentsPanel);
    app.use(SDKPlugin, sdk);
    app.use(PrimeVue, {
      unstyled: true,
      pt: Classic,
    });
    app.directive("tooltip", Tooltip);
    app.mount(container);
  };

  const unmount = () => {
    if (app !== undefined) {
      app.unmount();
      app = undefined;
    }

    if (container !== undefined) {
      container.remove();
      container = undefined;
    }
  };

  const start = () => {
    if (stopWatching !== undefined) {
      return;
    }

    const settingsStore = useSettingsStore();
    stopWatching = watch(
      () => settingsStore.backgroundAgentsEnabled,
      (enabled) => {
        if (enabled) {
          mount();
          return;
        }

        unmount();
      },
      {
        immediate: true,
      }
    );
  };

  const stop = () => {
    stopWatching?.();
    stopWatching = undefined;
    unmount();
  };

  return {
    start,
    stop,
  };
};
