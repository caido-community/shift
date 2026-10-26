import { setCurrentProjectId } from "../project";

import { agentsStore } from "./agents";
import { customAgentsStore } from "./custom-agents";
import { learningsStore } from "./learnings";
import { settingsStore } from "./settings";
import { skillsStore } from "./skills";

export { agentsStore, customAgentsStore, learningsStore, settingsStore, skillsStore };

const projectStores = [agentsStore, learningsStore];

export function initializeStores(projectId: Promise<string | undefined>): void {
  projectId
    .then(async (id) => {
      setCurrentProjectId(id);
      await Promise.all(
        [settingsStore, skillsStore, customAgentsStore, ...projectStores].map((store) =>
          store.load()
        )
      );
      await Promise.all([skillsStore.refreshDynamicSkills(), agentsStore.cleanupOldAgents()]);
    })
    .catch((error: unknown) => console.error(`Failed to initialize stores: ${String(error)}`));
}

export async function switchProject(projectId: string | undefined): Promise<void> {
  setCurrentProjectId(projectId);
  await Promise.all(projectStores.map((store) => store.load()));
}
