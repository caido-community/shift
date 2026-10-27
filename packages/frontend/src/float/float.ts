import { ShiftFloat } from "@/components/float";
import { mountShiftApp } from "@/dom/utils";
import { type FrontendSDK } from "@/types";

let lastCursorX: number | undefined;
let lastCursorY: number | undefined;
let unmountFloat: (() => void) | undefined;

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
  if (unmountFloat !== undefined) {
    return;
  }

  const maxLeft = window.innerWidth - FLOAT_WIDTH;
  const maxTop = window.innerHeight - FLOAT_HEIGHT;
  const centerLeft = (window.innerWidth - FLOAT_WIDTH) / 2;
  const centerTop = (window.innerHeight - FLOAT_HEIGHT) / 2;
  const rawLeft = lastCursorX !== undefined ? lastCursorX - 250 : centerLeft;
  const rawTop = lastCursorY !== undefined ? lastCursorY - 50 : centerTop;
  const initialLeft = Math.max(0, Math.min(rawLeft, maxLeft));
  const initialTop = Math.max(0, Math.min(rawTop, maxTop));

  unmountFloat = mountShiftApp(sdk, ShiftFloat, {
    props: { initialTop, initialLeft },
    primeVue: { zIndex: { overlay: 5000, tooltip: 5100 } },
    style: { position: "absolute", zIndex: "3000" },
  });
};

export const closeFloat = () => {
  unmountFloat?.();
  unmountFloat = undefined;
};
