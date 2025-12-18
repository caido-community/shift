import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import { ShiftFloat } from "@/components/float";
import { SDKPlugin } from "@/plugins/sdk";
import { useFloatStore } from "@/stores/float";
import { type FrontendSDK } from "@/types";

let lastCursorX: number | undefined;
let lastCursorY: number | undefined;

export const setupFloat = (sdk: FrontendSDK) => {
  sdk.commands.register("shift:toggle-float", {
    name: "Shift Floating Command",
    run: () => spawnFloat(sdk),
    group: "Shift",
  });
  sdk.shortcuts.register("shift:toggle-float", ["shift", "control", "k"]);

  document.addEventListener("mousemove", (e) => {
    lastCursorX = e.clientX;
    lastCursorY = e.clientY;
  });
};

const FLOAT_WIDTH = 500;
const FLOAT_HEIGHT = 125;

const spawnFloat = (sdk: FrontendSDK) => {
  if (document.querySelector("[data-plugin='shift-float']")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "plugin--shift";
  container.dataset.plugin = "shift-float";
  container.style.position = "absolute";
  container.style.zIndex = "3000";
  document.body.appendChild(container);

  const maxLeft = window.innerWidth - FLOAT_WIDTH;
  const maxTop = window.innerHeight - FLOAT_HEIGHT;
  const rawLeft = lastCursorX !== undefined ? lastCursorX - 250 : 0;
  const rawTop = lastCursorY !== undefined ? lastCursorY - 50 : 0;
  const initialLeft = Math.max(0, Math.min(rawLeft, maxLeft));
  const initialTop = Math.max(0, Math.min(rawTop, maxTop));

  const app = createApp(ShiftFloat, {
    initialTop,
    initialLeft,
  });

  app.use(SDKPlugin, sdk);
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
    zIndex: {
      overlay: 5000,
    },
  });
  app.directive("tooltip", Tooltip);

  app.mount(container);

  const floatStore = useFloatStore();
  floatStore.focusTextarea();
};
