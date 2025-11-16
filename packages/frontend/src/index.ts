import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

import { setupAgents } from "@/agents";
import { setupReplayCollectionCorrelation } from "@/agents/collectionAutoExecute";
import { GenericInputDialog } from "@/components/inputDialog";
import { createDOMManager } from "@/dom";
import { setupFloat } from "@/float";
import { setupTestShift } from "@/float/testShift";
import { setupRenaming } from "@/renaming";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";

export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic
  });

  app.directive("tooltip", Tooltip);

  const pinia = createPinia();
  app.use(pinia);

  app.use(SDKPlugin, sdk);

  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  root.id = `plugin--shift`;

  app.mount(root);

  sdk.navigation.addPage("/shift", {
    body: root,
  });

  sdk.sidebar.registerItem("Shift", "/shift", {
    icon: "fas fa-wand-magic-sparkles",
  });

  setupAgents(sdk);
  setupFloat(sdk);
  setupRenaming(sdk);
  setupReplayCollectionCorrelation(sdk);
  setupTestShift(sdk);

  sdk.commands.register("shift:add-to-memory", {
    name: "Add Learning",
    run: () => {
      let dialog: { close: () => void } = { close: () => {} };
      const configStore = useConfigStore();

      const selection = window.getSelection();
      if (selection === null) return;

      const text = selection.toString();
      if (text.length === 0) return;

      const handleConfirm = async (value: string) => {
        dialog.close();
        if (value.trim() === "") {
          return;
        }

        try {
          await configStore.addLearning(value);
          sdk.window.showToast(`Learning stored for this project`, {
            variant: "info",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          sdk.window.showToast(`[Shift] Failed to store learning: ${message}`, {
            variant: "error",
          });
        }
      };

      const handleCancel = () => {
        dialog.close();
      };

      dialog = sdk.window.showDialog(
        {
          component: GenericInputDialog,
          props: {
            title: "Add Learning",
            placeholder: "Enter learning content...",
            initialValue: text,
            onConfirm: () => handleConfirm,
            onCancel: () => handleCancel,
          },
        },
        {
          title: "Add Learning",
          closeOnEscape: true,
          closable: true,
          draggable: true,
          modal: true,
          position: "center",
        },
      );
    },
  });

  sdk.shortcuts.register("shift:add-to-memory", ["shift", "control", "m"]);

  const domManager = createDOMManager(sdk);
  domManager.drawer.start();
  domManager.indicators.start();

  sdk.replay.onCurrentSessionChange((event) => {
    const agentStore = useAgentsStore();
    if (event.sessionId !== undefined) {
      agentStore.selectAgent(event.sessionId);
    }
  });

  // Messy because we dont have a proper way to get the current session id from the sdk yet.
  const setCurrentSession = () => {
    const agentStore = useAgentsStore();
    const currentSessionId = document.querySelector('div[data-is-selected="true"]')?.getAttribute('data-session-id') ?? ""
    if (currentSessionId.length > 0) {
      agentStore.selectAgent(currentSessionId);
    }
  } 
  if (location.hash.startsWith("#/replay")) {
    setCurrentSession();
  }
  sdk.navigation.onPageChange((event) => {
    const agentStore = useAgentsStore();
    if (agentStore.selectedAgent === undefined) {   
      setTimeout(() => {
        setCurrentSession();
      }, 500);
    }
  });
};
