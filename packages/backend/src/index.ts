import type { DefineAPI, SDK } from "caido:plugin";

import {
  addDynamicSkill,
  addLearning,
  addModel,
  addStaticSkill,
  clearLearnings,
  getAgent,
  getAgents,
  getLearnings,
  getModelsConfig,
  getProjectOverride,
  getProjectOverrides,
  getSettings,
  getSkillDefinitions,
  getSkills,
  refreshSkills,
  removeAgent,
  removeLearnings,
  removeModel,
  removeProjectOverride,
  removeSkill,
  setLearnings,
  setProjectOverride,
  updateDynamicSkill,
  updateLearning,
  updateModelConfig,
  updateModelEnabledFor,
  updateRenaming,
  updateSettings,
  updateStaticSkill,
  writeAgent,
} from "./api";
import { setSDK } from "./sdk";
import {
  getAgentsStore,
  getLearningsStore,
  getModelsStore,
  getSettingsStore,
  getSkillsStore,
} from "./stores";

export * from "./types";

export type API = DefineAPI<{
  getModelsConfig: typeof getModelsConfig;
  addModel: typeof addModel;
  removeModel: typeof removeModel;
  updateModelConfig: typeof updateModelConfig;
  updateModelEnabledFor: typeof updateModelEnabledFor;
  getAgent: typeof getAgent;
  getAgents: typeof getAgents;
  writeAgent: typeof writeAgent;
  removeAgent: typeof removeAgent;
  getSkills: typeof getSkills;
  getSkillDefinitions: typeof getSkillDefinitions;
  addStaticSkill: typeof addStaticSkill;
  addDynamicSkill: typeof addDynamicSkill;
  updateStaticSkill: typeof updateStaticSkill;
  updateDynamicSkill: typeof updateDynamicSkill;
  removeSkill: typeof removeSkill;
  refreshSkills: typeof refreshSkills;
  getProjectOverride: typeof getProjectOverride;
  getProjectOverrides: typeof getProjectOverrides;
  setProjectOverride: typeof setProjectOverride;
  removeProjectOverride: typeof removeProjectOverride;
  getSettings: typeof getSettings;
  updateSettings: typeof updateSettings;
  updateRenaming: typeof updateRenaming;
  getLearnings: typeof getLearnings;
  addLearning: typeof addLearning;
  updateLearning: typeof updateLearning;
  removeLearnings: typeof removeLearnings;
  setLearnings: typeof setLearnings;
  clearLearnings: typeof clearLearnings;
}>;

export function init(sdk: SDK<API>) {
  setSDK(sdk);
  const modelsStore = getModelsStore();
  const agentsStore = getAgentsStore();
  const skillsStore = getSkillsStore();
  const settingsStore = getSettingsStore();
  const learningsStore = getLearningsStore();

  modelsStore.initialize();
  agentsStore.initialize();
  skillsStore.initialize();
  settingsStore.initialize();
  learningsStore.initialize();

  sdk.events.onProjectChange(async (_sdk, project) => {
    await agentsStore.switchProject(project?.getId());
    await learningsStore.switchProject(project?.getId());
    skillsStore.switchProject(project?.getId());
  });

  sdk.api.register("getModelsConfig", getModelsConfig);
  sdk.api.register("addModel", addModel);
  sdk.api.register("removeModel", removeModel);
  sdk.api.register("updateModelConfig", updateModelConfig);
  sdk.api.register("updateModelEnabledFor", updateModelEnabledFor);

  sdk.api.register("getAgent", getAgent);
  sdk.api.register("getAgents", getAgents);
  sdk.api.register("writeAgent", writeAgent);
  sdk.api.register("removeAgent", removeAgent);

  sdk.api.register("getSkills", getSkills);
  sdk.api.register("getSkillDefinitions", getSkillDefinitions);
  sdk.api.register("addStaticSkill", addStaticSkill);
  sdk.api.register("addDynamicSkill", addDynamicSkill);
  sdk.api.register("updateStaticSkill", updateStaticSkill);
  sdk.api.register("updateDynamicSkill", updateDynamicSkill);
  sdk.api.register("removeSkill", removeSkill);
  sdk.api.register("refreshSkills", refreshSkills);
  sdk.api.register("getProjectOverride", getProjectOverride);
  sdk.api.register("getProjectOverrides", getProjectOverrides);
  sdk.api.register("setProjectOverride", setProjectOverride);
  sdk.api.register("removeProjectOverride", removeProjectOverride);

  sdk.api.register("getSettings", getSettings);
  sdk.api.register("updateSettings", updateSettings);
  sdk.api.register("updateRenaming", updateRenaming);

  sdk.api.register("getLearnings", getLearnings);
  sdk.api.register("addLearning", addLearning);
  sdk.api.register("updateLearning", updateLearning);
  sdk.api.register("removeLearnings", removeLearnings);
  sdk.api.register("setLearnings", setLearnings);
  sdk.api.register("clearLearnings", clearLearnings);
}
