import {
  type CreateCustomAgentInput,
  type CustomAgent,
  type ResolvedCustomAgent,
  Result,
  type UpdateCustomAgentInput,
} from "shared";

import { requireSDK } from "../../sdk";
import { generateID } from "../../utils";
import { GlobalStore } from "../global-store";
import { getSkillsStore } from "../skills";

import { createInitialModel, type CustomAgentsMessage, type CustomAgentsModel } from "./model";
import { update } from "./update";

class CustomAgentsStore extends GlobalStore<CustomAgentsModel, CustomAgentsMessage> {
  private currentProjectId: string | undefined;

  constructor() {
    super("custom-agents");
  }

  protected createInitialModel(): CustomAgentsModel {
    return createInitialModel();
  }

  protected update(model: CustomAgentsModel, message: CustomAgentsMessage): CustomAgentsModel {
    return update(model, message);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    const sdk = requireSDK();
    const project = await sdk.projects.getCurrent();
    this.currentProjectId = project?.getId();
  }

  switchProject(projectId: string | undefined): void {
    this.currentProjectId = projectId;
    this.notify();
  }

  private isVisibleInCurrentProject(agent: CustomAgent): boolean {
    if (agent.scope === "global") {
      return true;
    }
    if (this.currentProjectId === undefined) {
      return false;
    }
    return agent.projectId === this.currentProjectId;
  }

  getAgentDefinitions(): CustomAgent[] {
    return this.getModel().agents.filter((agent) => this.isVisibleInCurrentProject(agent));
  }

  getResolvedAgents(): ResolvedCustomAgent[] {
    const skillsStore = getSkillsStore();
    const allSkills = skillsStore.getSkills();

    return this.getAgentDefinitions().map((agent) => {
      const skills = agent.skillIds
        .map((id) => allSkills.find((s) => s.id === id))
        .filter((s) => s !== undefined);

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        skills,
        allowedWorkflowIds: agent.allowedWorkflowIds,
        instructions: agent.instructions,
      };
    });
  }

  findByCollection(collectionName: string): CustomAgent[] {
    return this.getAgentDefinitions().filter((agent) =>
      agent.boundCollections.includes(collectionName)
    );
  }

  async addAgent(input: CreateCustomAgentInput): Promise<Result<string>> {
    if (input.scope === "project" && this.currentProjectId === undefined) {
      return Result.err("Cannot create project-scoped agent without an active project");
    }

    const id = generateID("agent-");

    const agent: CustomAgent = {
      id,
      name: input.name,
      description: input.description ?? "",
      skillIds: input.skillIds ?? [],
      allowedWorkflowIds: input.allowedWorkflowIds,
      instructions: input.instructions ?? "",
      scope: input.scope,
      projectId: input.scope === "project" ? this.currentProjectId : undefined,
      boundCollections: input.boundCollections ?? [],
    };

    this.dispatch({ type: "ADD_AGENT", agent });

    await this.persist();
    this.notify();

    return Result.ok(id);
  }

  async updateAgent(id: string, updates: UpdateCustomAgentInput): Promise<Result<void>> {
    const existing = this.getModel().agents.find((a) => a.id === id);
    if (existing === undefined) {
      return Result.err("Agent not found");
    }

    if (updates.scope === "project" && this.currentProjectId === undefined) {
      return Result.err("Cannot change scope to project without an active project");
    }

    this.dispatch({
      type: "UPDATE_AGENT",
      id,
      updates,
      projectId: updates.scope === "project" ? this.currentProjectId : undefined,
    });

    await this.persist();
    this.notify();

    return Result.ok(undefined);
  }

  async removeAgent(id: string): Promise<void> {
    this.dispatch({ type: "REMOVE_AGENT", id });

    await this.persist();
    this.notify();
  }
}

let instance: CustomAgentsStore | undefined;

export function getCustomAgentsStore(): CustomAgentsStore {
  if (instance === undefined) {
    instance = new CustomAgentsStore();
  }
  return instance;
}
