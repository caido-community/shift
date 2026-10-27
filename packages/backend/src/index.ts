import type { DefineAPI, SDK } from "caido:plugin";

import {
  addCustomAgent,
  addDynamicSkill,
  addLearning,
  addStaticSkill,
  cancelAgentBinaryExecution,
  clearLearnings,
  executeAgentBinary,
  getAgent,
  getAgents,
  getCustomAgentDefinitions,
  getLearnings,
  getLegacyCollectionAutoRunMigrationSummary,
  getProjectOverride,
  getResolvedCustomAgents,
  getSettings,
  getSkillDefinitions,
  getSkills,
  refreshSkills,
  removeAgent,
  removeCustomAgent,
  removeLearnings,
  removeProjectOverride,
  removeSkill,
  setProjectOverride,
  updateCustomAgent,
  updateDynamicSkill,
  updateLearning,
  updateSettings,
  updateStaticSkill,
  writeAgent,
} from "./api";
import { setSDK } from "./sdk";
import { initializeStores, switchProject } from "./stores";
import type { BackendEvents } from "./types";

export * from "./types";

export type API = DefineAPI<{
  getAgent: typeof getAgent;
  getAgents: typeof getAgents;
  writeAgent: typeof writeAgent;
  removeAgent: typeof removeAgent;
  getSkills: typeof getSkills;
  getSkillDefinitions: typeof getSkillDefinitions;
  getLegacyCollectionAutoRunMigrationSummary: typeof getLegacyCollectionAutoRunMigrationSummary;
  addStaticSkill: typeof addStaticSkill;
  addDynamicSkill: typeof addDynamicSkill;
  updateStaticSkill: typeof updateStaticSkill;
  updateDynamicSkill: typeof updateDynamicSkill;
  removeSkill: typeof removeSkill;
  refreshSkills: typeof refreshSkills;
  getProjectOverride: typeof getProjectOverride;
  setProjectOverride: typeof setProjectOverride;
  removeProjectOverride: typeof removeProjectOverride;
  getResolvedCustomAgents: typeof getResolvedCustomAgents;
  getCustomAgentDefinitions: typeof getCustomAgentDefinitions;
  addCustomAgent: typeof addCustomAgent;
  updateCustomAgent: typeof updateCustomAgent;
  removeCustomAgent: typeof removeCustomAgent;
  executeAgentBinary: typeof executeAgentBinary;
  cancelAgentBinaryExecution: typeof cancelAgentBinaryExecution;
  getSettings: typeof getSettings;
  updateSettings: typeof updateSettings;
  getLearnings: typeof getLearnings;
  addLearning: typeof addLearning;
  updateLearning: typeof updateLearning;
  removeLearnings: typeof removeLearnings;
  clearLearnings: typeof clearLearnings;
}>;

export function init(sdk: SDK<API, BackendEvents>) {
  setSDK(sdk);
  initializeStores(sdk).catch((error: unknown) =>
    console.error(`Failed to initialize stores: ${String(error)}`)
  );

  sdk.events.onProjectChange((_sdk, project) => switchProject(project?.getId()));

  sdk.api.register("getAgent", getAgent);
  sdk.api.register("getAgents", getAgents);
  sdk.api.register("writeAgent", writeAgent);
  sdk.api.register("removeAgent", removeAgent);

  sdk.api.register("getSkills", getSkills);
  sdk.api.register("getSkillDefinitions", getSkillDefinitions);
  sdk.api.register(
    "getLegacyCollectionAutoRunMigrationSummary",
    getLegacyCollectionAutoRunMigrationSummary
  );
  sdk.api.register("addStaticSkill", addStaticSkill);
  sdk.api.register("addDynamicSkill", addDynamicSkill);
  sdk.api.register("updateStaticSkill", updateStaticSkill);
  sdk.api.register("updateDynamicSkill", updateDynamicSkill);
  sdk.api.register("removeSkill", removeSkill);
  sdk.api.register("refreshSkills", refreshSkills);
  sdk.api.register("getProjectOverride", getProjectOverride);
  sdk.api.register("setProjectOverride", setProjectOverride);
  sdk.api.register("removeProjectOverride", removeProjectOverride);

  sdk.api.register("getResolvedCustomAgents", getResolvedCustomAgents);
  sdk.api.register("getCustomAgentDefinitions", getCustomAgentDefinitions);
  sdk.api.register("addCustomAgent", addCustomAgent);
  sdk.api.register("updateCustomAgent", updateCustomAgent);
  sdk.api.register("removeCustomAgent", removeCustomAgent);
  sdk.api.register("executeAgentBinary", executeAgentBinary);
  sdk.api.register("cancelAgentBinaryExecution", cancelAgentBinaryExecution);

  sdk.api.register("getSettings", getSettings);
  sdk.api.register("updateSettings", updateSettings);

  sdk.api.register("getLearnings", getLearnings);
  sdk.api.register("addLearning", addLearning);
  sdk.api.register("updateLearning", updateLearning);
  sdk.api.register("removeLearnings", removeLearnings);
  sdk.api.register("clearLearnings", clearLearnings);
}
