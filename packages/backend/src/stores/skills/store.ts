import {
  type AgentSkill,
  type AgentSkillDefinition,
  type CreateDynamicSkillInput,
  type CreateStaticSkillInput,
  type DynamicSkillDefinition,
  Result,
  type UpdateDynamicSkillInput,
  type UpdateStaticSkillInput,
} from "shared";

import { requireSDK } from "../../sdk";
import { fetchSkillContent, validateSkillUrl } from "../../skills";
import { generateID } from "../../utils";
import { GlobalStore } from "../global-store";

import { createInitialModel, type SkillsMessage, type SkillsModel } from "./model";
import { update } from "./update";

class SkillsStore extends GlobalStore<SkillsModel, SkillsMessage> {
  private resolvedCache: Map<string, AgentSkill> = new Map();
  private currentProjectId: string | undefined;

  constructor() {
    super("skills");
  }

  protected createInitialModel(): SkillsModel {
    return createInitialModel();
  }

  protected update(model: SkillsModel, message: SkillsMessage): SkillsModel {
    return update(model, message);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    const sdk = requireSDK();
    const project = await sdk.projects.getCurrent();
    this.currentProjectId = project?.getId();
    await this.refreshDynamicSkills();
  }

  switchProject(projectId: string | undefined): void {
    this.currentProjectId = projectId;
    this.notify();
  }

  private isSkillVisibleInCurrentProject(skill: AgentSkillDefinition): boolean {
    if (skill.scope === "global") {
      return true;
    }
    if (this.currentProjectId === undefined) {
      return false;
    }
    return skill.projectId === this.currentProjectId;
  }

  getSkillDefinitions(): AgentSkillDefinition[] {
    return this.getModel().skills.filter((skill) => this.isSkillVisibleInCurrentProject(skill));
  }

  getSkills(): AgentSkill[] {
    const result: AgentSkill[] = [];

    for (const definition of this.getModel().skills) {
      if (!this.isSkillVisibleInCurrentProject(definition)) {
        continue;
      }

      if (definition.type === "static") {
        result.push({
          id: definition.id,
          title: definition.title,
          content: definition.content,
        });
      } else {
        const cached = this.resolvedCache.get(definition.id);
        if (cached !== undefined) {
          result.push(cached);
        }
      }
    }

    return result;
  }

  async addStaticSkill(input: CreateStaticSkillInput): Promise<Result<string>> {
    if (input.scope === "project" && this.currentProjectId === undefined) {
      return Result.err("Cannot create project-scoped skill without an active project");
    }

    const id = generateID("skill-");

    this.dispatch({
      type: "ADD_STATIC_SKILL",
      definition: {
        type: "static",
        id,
        title: input.title,
        content: input.content,
        scope: input.scope,
        projectId: input.scope === "project" ? this.currentProjectId : undefined,
      },
    });

    await this.persist();
    this.notify();

    return Result.ok(id);
  }

  async addDynamicSkill(input: CreateDynamicSkillInput): Promise<Result<string>> {
    if (input.scope === "project" && this.currentProjectId === undefined) {
      return Result.err("Cannot create project-scoped skill without an active project");
    }

    const validation = validateSkillUrl(input.url);
    if (validation.valid === false) {
      return Result.err(validation.error);
    }

    const id = generateID("skill-");
    const definition: DynamicSkillDefinition = {
      type: "dynamic",
      id,
      title: input.title,
      url: input.url,
      scope: input.scope,
      projectId: input.scope === "project" ? this.currentProjectId : undefined,
    };

    const resolved = await fetchSkillContent(definition);
    if (resolved === undefined) {
      return Result.err("Failed to fetch skill content from URL");
    }

    this.resolvedCache.set(id, resolved);

    this.dispatch({ type: "ADD_DYNAMIC_SKILL", definition });

    await this.persist();
    this.notify();

    return Result.ok(id);
  }

  async updateStaticSkill(id: string, updates: UpdateStaticSkillInput): Promise<Result<void>> {
    const existingSkill = this.getModel().skills.find((s) => s.id === id && s.type === "static");
    if (existingSkill === undefined) {
      return Result.err("Skill not found");
    }

    if (updates.scope === "project" && this.currentProjectId === undefined) {
      return Result.err("Cannot change scope to project without an active project");
    }

    this.dispatch({
      type: "UPDATE_STATIC_SKILL",
      id,
      updates,
      projectId: updates.scope === "project" ? this.currentProjectId : undefined,
    });

    await this.persist();
    this.notify();

    return Result.ok(undefined);
  }

  async updateDynamicSkill(id: string, updates: UpdateDynamicSkillInput): Promise<Result<void>> {
    const existingSkill = this.getModel().skills.find((s) => s.id === id && s.type === "dynamic");
    if (existingSkill === undefined) {
      return Result.err("Skill not found");
    }

    if (updates.scope === "project" && this.currentProjectId === undefined) {
      return Result.err("Cannot change scope to project without an active project");
    }

    if (updates.url !== undefined) {
      const validation = validateSkillUrl(updates.url);
      if (validation.valid === false) {
        return Result.err(validation.error);
      }
    }

    this.dispatch({
      type: "UPDATE_DYNAMIC_SKILL",
      id,
      updates,
      projectId: updates.scope === "project" ? this.currentProjectId : undefined,
    });

    await this.persist();

    const updatedSkill = this.getModel().skills.find((s) => s.id === id && s.type === "dynamic");
    if (updatedSkill !== undefined && updatedSkill.type === "dynamic") {
      const resolved = await fetchSkillContent(updatedSkill);
      if (resolved !== undefined) {
        this.resolvedCache.set(id, resolved);
      } else {
        this.resolvedCache.delete(id);
      }
    }

    this.notify();

    return Result.ok(undefined);
  }

  async removeSkill(id: string): Promise<void> {
    this.dispatch({ type: "REMOVE_SKILL", id });

    this.resolvedCache.delete(id);

    await this.persist();
    this.notify();
  }

  async refreshDynamicSkills(): Promise<void> {
    const dynamicSkills = this.getModel().skills.filter(
      (s): s is DynamicSkillDefinition => s.type === "dynamic"
    );

    const fetchPromises = dynamicSkills.map(async (skill) => {
      const resolved = await fetchSkillContent(skill);
      if (resolved !== undefined) {
        this.resolvedCache.set(skill.id, resolved);
      } else {
        this.resolvedCache.delete(skill.id);
      }
    });

    await Promise.all(fetchPromises);
    this.notify();
  }
}

let instance: SkillsStore | undefined;

export function getSkillsStore(): SkillsStore {
  if (instance === undefined) {
    instance = new SkillsStore();
  }
  return instance;
}
