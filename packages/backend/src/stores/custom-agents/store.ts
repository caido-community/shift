import {
  type CreateCustomAgentInput,
  type CustomAgent,
  type CustomAgentsState,
  type ResolvedCustomAgent,
  Result,
  type UpdateCustomAgentInput,
} from "shared";

import { isVisibleInCurrentProject, projectIdForScope } from "../../project";
import { generateID, isRecord } from "../../utils";
import { skillsStore } from "../skills";
import { Store } from "../store";

import { createInitialModel, type CustomAgentsMessage, type CustomAgentsModel } from "./model";
import { update } from "./update";

const agentDefaults: Pick<
  CustomAgent,
  "description" | "skillIds" | "instructions" | "boundCollections"
> = { description: "", skillIds: [], instructions: "", boundCollections: [] };

class CustomAgentsStore extends Store<CustomAgentsModel, CustomAgentsMessage> {
  constructor() {
    super({ filename: "custom-agents", initialModel: createInitialModel, update });
  }

  protected parse(loaded: unknown): CustomAgentsModel | undefined {
    if (!isRecord(loaded)) {
      return undefined;
    }
    const agents: unknown = loaded.agents ?? [];
    if (!Array.isArray(agents) || !agents.every(isRecord)) {
      return undefined;
    }
    return {
      ...loaded,
      agents: agents.map((agent) => ({ ...agentDefaults, ...agent }) as CustomAgent),
    };
  }

  getAgentDefinitions(): CustomAgent[] {
    return this.model.agents.filter(isVisibleInCurrentProject);
  }

  getResolvedAgents(): ResolvedCustomAgent[] {
    const allSkills = skillsStore.getSkills();

    return this.getAgentDefinitions().map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      skills: agent.skillIds
        .map((id) => allSkills.find((skill) => skill.id === id))
        .filter((skill) => skill !== undefined),
      allowedWorkflowIds: agent.allowedWorkflowIds,
      allowedBinaries: agent.allowedBinaries,
      instructions: agent.instructions,
    }));
  }

  getState(): CustomAgentsState {
    return { definitions: this.getAgentDefinitions(), agents: this.getResolvedAgents() };
  }

  private checkBoundCollections(boundCollections: string[], excludedAgentId?: string): Result {
    for (const agent of this.getAgentDefinitions()) {
      if (agent.id === excludedAgentId) {
        continue;
      }
      const collectionName = boundCollections.find((name) => agent.boundCollections.includes(name));
      if (collectionName !== undefined) {
        return Result.err(`Collection "${collectionName}" is already bound to "${agent.name}"`);
      }
    }
    return Result.ok(undefined);
  }

  async addAgent(input: CreateCustomAgentInput): Promise<Result<CustomAgentsState>> {
    const projectId = projectIdForScope(input.scope);
    if (projectId.kind === "Error") {
      return projectId;
    }

    const boundCollections = [...new Set(input.boundCollections)];
    const check = this.checkBoundCollections(boundCollections);
    if (check.kind === "Error") {
      return check;
    }

    await this.commit({
      type: "ADD_AGENT",
      agent: {
        id: generateID("agent-"),
        name: input.name,
        description: input.description,
        skillIds: input.skillIds,
        allowedWorkflowIds: input.allowedWorkflowIds,
        allowedBinaries: input.allowedBinaries,
        instructions: input.instructions,
        scope: input.scope,
        projectId: projectId.value,
        boundCollections,
      },
    });
    return Result.ok(this.getState());
  }

  async updateAgent(
    id: string,
    updates: UpdateCustomAgentInput
  ): Promise<Result<CustomAgentsState>> {
    const existing = this.model.agents.find((a) => a.id === id);
    if (existing === undefined) {
      return Result.err("Agent not found");
    }

    const projectId = projectIdForScope(updates.scope);
    if (projectId.kind === "Error") {
      return projectId;
    }

    const boundCollections = [...new Set(updates.boundCollections ?? existing.boundCollections)];
    const check = this.checkBoundCollections(boundCollections, id);
    if (check.kind === "Error") {
      return check;
    }

    await this.commit({
      type: "UPDATE_AGENT",
      id,
      updates: { ...updates, boundCollections },
      projectId: projectId.value,
    });
    return Result.ok(this.getState());
  }

  async removeAgent(id: string): Promise<CustomAgentsState> {
    await this.commit({ type: "REMOVE_AGENT", id });
    return this.getState();
  }
}

export const customAgentsStore = new CustomAgentsStore();
