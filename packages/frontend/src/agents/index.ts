import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";

export const setupAgents = (sdk: FrontendSDK) => {
  const uiStore = useUIStore();

  sdk.replay.addToSlot("topbar", {
    type: "Button",
    label: "Agent",
    onClick: () => uiStore.toggleDrawer(),
  });

  sdk.commands.register("shift:toggle-drawer", {
    name: "Toggle Shift Agents Drawer",
    run: () => uiStore.toggleDrawer(),
  });

  sdk.shortcuts.register("shift:toggle-drawer", ["shift", "control", "i"]);
};
