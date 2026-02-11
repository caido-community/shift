import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

import { setupAgents } from "@/agent";
import { createDOMManager } from "@/dom";
import { setupFloat } from "@/float";
import { setupRenaming } from "@/renaming";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useLearningsStore } from "@/stores/learnings";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";

async function initializeStores(sdk: FrontendSDK) {
  const modelsStore = useModelsStore();
  const settingsStore = useSettingsStore();
  const learningsStore = useLearningsStore();
  const skillsStore = useSkillsStore();
  const customAgentsStore = useCustomAgentsStore();

  await Promise.all([
    modelsStore.initialize(),
    settingsStore.initialize(),
    learningsStore.initialize(),
    skillsStore.initialize(),
    customAgentsStore.initialize(),
  ]);

  sdk.projects.onCurrentProjectChange(() => {
    skillsStore.initialize();
    customAgentsStore.initialize();
    learningsStore.initialize();
  });
}

export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
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

  initializeStores(sdk).then(() => {
    setupAgents(sdk);
    setupFloat(sdk);
    setupRenaming(sdk);
  });

  const { drawer, indicators } = createDOMManager(sdk);
  drawer.start();
  indicators.start();
};
