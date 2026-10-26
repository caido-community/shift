import { Classic } from "@caido/primevue";
import PrimeVue, { type PrimeVueConfiguration } from "primevue/config";
import Tooltip from "primevue/tooltip";
import { type Component, createApp } from "vue";

import { SDKPlugin } from "@/plugins/sdk";
import { type FrontendSDK } from "@/types";

type MountOptions = {
  props?: Record<string, unknown>;
  primeVue?: PrimeVueConfiguration;
  style?: Partial<CSSStyleDeclaration>;
};

export const mountShiftApp = (
  sdk: FrontendSDK,
  component: Component,
  { props, primeVue, style }: MountOptions = {}
): (() => void) => {
  const container = document.createElement("div");
  // Plugin CSS is scoped to #plugin--shift.
  container.id = "plugin--shift";
  Object.assign(container.style, style);
  document.body.appendChild(container);

  const app = createApp(component, props);
  app.use(SDKPlugin, sdk);
  app.use(PrimeVue, { unstyled: true, pt: Classic, ...primeVue });
  app.directive("tooltip", Tooltip);
  app.mount(container);

  return () => {
    app.unmount();
    container.remove();
  };
};

export const watchReplayPage = (
  sdk: FrontendSDK,
  onEnter: () => void,
  onLeave: () => void
): (() => void) => {
  if (location.hash === "#/replay") {
    onEnter();
  }

  const handle = sdk.navigation.onPageChange((event) => {
    if (event.path === "/replay") {
      onEnter();
    } else {
      onLeave();
    }
  });
  return () => handle.stop();
};
