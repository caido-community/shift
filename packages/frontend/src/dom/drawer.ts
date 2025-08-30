import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { type App, createApp } from "vue";

import { Drawer } from "@/components/agent";
import { onLocationChange } from "@/dom";
import { SDKPlugin } from "@/plugins/sdk";
import { type FrontendSDK } from "@/types";

export const useDrawerManager = (sdk: FrontendSDK) => {
  let app: App | undefined = undefined;
  let unsubscribe: (() => void) | undefined = undefined;

  const start = () => {
    if (location.hash === "#/replay") {
      inject();
    }

    unsubscribe = onLocationChange(({ newHash }) => {
      if (newHash === "#/replay") {
        inject();
      } else {
        remove();
      }
    });
  };

  const inject = () => {
    displayDrawer(document.body);
  };

  const stop = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
    }
    remove();
  };

  const remove = () => {
    if (app) {
      app.unmount();
      app = undefined;
    }
  };

  const displayDrawer = (root: Element) => {
    const container = document.createElement("div");
    container.className = "shift-agents-injection";
    container.id = "plugin--shift";

    root.appendChild(container);

    if (!app) {
      app = createApp(Drawer, {});
      app.use(SDKPlugin, sdk);
      app.use(PrimeVue, {
        unstyled: true,
        pt: Classic,
      });
      app.directive("tooltip", Tooltip);
    }
    app.mount(container);
  };

  return {
    start,
    stop,
  };
};
