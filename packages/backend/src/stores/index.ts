import { setCurrentProjectId } from "../project";
import { type BackendSDK } from "../types";

import { agentsStore } from "./agents";
import { customAgentsStore } from "./custom-agents";
import { learningsStore } from "./learnings";
import { settingsStore } from "./settings";
import { skillsStore } from "./skills";

export { agentsStore, customAgentsStore, learningsStore, settingsStore, skillsStore };

export async function initializeStores(sdk: BackendSDK): Promise<void> {
  const project = await sdk.projects.getCurrent();
  setCurrentProjectId(project?.getId());

  await Promise.all([
    settingsStore.load(),
    skillsStore.load(),
    customAgentsStore.load(),
    agentsStore.load(),
    learningsStore.load(),
  ]);

  await skillsStore.refreshDynamicSkills();
  await agentsStore.cleanupOldAgents();
}

export async function switchProject(projectId: string | undefined): Promise<void> {
  setCurrentProjectId(projectId);
  await Promise.all([agentsStore.load(), learningsStore.load()]);
}
