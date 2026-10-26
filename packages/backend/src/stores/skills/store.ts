import {
  type AgentSkill,
  type AgentSkillDefinition,
  type CreateDynamicSkillInput,
  type CreateStaticSkillInput,
  type DynamicSkillDefinition,
  type LegacyCollectionAutoRunMigrationEntry,
  type LegacyCollectionAutoRunMigrationSummary,
  type ProjectSkillOverride,
  Result,
  type SetProjectOverrideInput,
  type SkillsState,
  type UpdateDynamicSkillInput,
  type UpdateStaticSkillInput,
} from "shared";

import {
  getCurrentProjectId,
  isVisibleInCurrentProject,
  projectIdForScope,
  requireProjectId,
} from "../../project";
import { fetchSkillContent, validateSkillUrl } from "../../skills";
import { generateID, isRecord } from "../../utils";
import { Store } from "../store";

import {
  extractLegacyCollectionAutoRunMigration,
  summarizeLegacyCollectionAutoRunMigration,
} from "./legacy-migration";
import { createInitialModel, type SkillsMessage, type SkillsModel } from "./model";
import { update } from "./update";

class SkillsStore extends Store<SkillsModel, SkillsMessage> {
  private resolvedCache = new Map<string, AgentSkill>();
  private legacyCollectionAutoRunEntries: LegacyCollectionAutoRunMigrationEntry[] = [];

  constructor() {
    super({ filename: "skills", initialModel: createInitialModel, update });
  }

  protected parse(loaded: unknown): SkillsModel | undefined {
    const migration = extractLegacyCollectionAutoRunMigration(loaded);
    if (!isRecord(migration.cleaned)) {
      return undefined;
    }

    const model = { ...createInitialModel(), ...migration.cleaned };
    if (!Array.isArray(model.skills) || !Array.isArray(model.projectOverrides)) {
      return undefined;
    }

    this.legacyCollectionAutoRunEntries = migration.entries;
    return model as SkillsModel;
  }

  override async load(): Promise<void> {
    await super.load();
    // Drop the legacy fields from the file so the migration notice is shown only once.
    if (this.legacyCollectionAutoRunEntries.length > 0) {
      await this.save();
    }
  }

  getLegacyCollectionAutoRunMigrationSummary(): LegacyCollectionAutoRunMigrationSummary {
    const summary = summarizeLegacyCollectionAutoRunMigration(
      this.legacyCollectionAutoRunEntries,
      getCurrentProjectId()
    );

    // The notice should be shown only once for the migration event that happened on load.
    this.legacyCollectionAutoRunEntries = [];

    return summary;
  }

  getSkillDefinitions(): AgentSkillDefinition[] {
    return this.model.skills.filter(isVisibleInCurrentProject);
  }

  getProjectOverride(skillId: string): ProjectSkillOverride | undefined {
    const projectId = getCurrentProjectId();
    if (projectId === undefined) {
      return undefined;
    }
    return this.model.projectOverrides.find(
      (o) => o.skillId === skillId && o.projectId === projectId
    );
  }

  private applyProjectOverride(skill: AgentSkill): AgentSkill {
    const override = this.getProjectOverride(skill.id);
    if (override === undefined || override.additionalContent.trim() === "") {
      return skill;
    }
    return {
      ...skill,
      content: `${skill.content}\n\n${override.additionalContent}`,
    };
  }

  getSkills(): AgentSkill[] {
    const result: AgentSkill[] = [];

    for (const definition of this.getSkillDefinitions()) {
      let skill: AgentSkill;
      if (definition.type === "static") {
        skill = {
          id: definition.id,
          title: definition.title,
          content: definition.content,
          description: definition.description,
          attachMode: definition.attachMode,
        };
      } else {
        const cached = this.resolvedCache.get(definition.id);
        if (cached === undefined) {
          continue;
        }
        skill = {
          ...cached,
          description: definition.description,
          attachMode: definition.attachMode,
        };
      }

      result.push(this.applyProjectOverride(skill));
    }

    return result;
  }

  getState(): SkillsState {
    return { definitions: this.getSkillDefinitions(), skills: this.getSkills() };
  }

  async addStaticSkill(input: CreateStaticSkillInput): Promise<Result<SkillsState>> {
    const projectId = projectIdForScope(input.scope);
    if (projectId.kind === "Error") {
      return projectId;
    }

    await this.commit({
      type: "ADD_STATIC_SKILL",
      definition: {
        type: "static",
        id: generateID("skill-"),
        title: input.title,
        content: input.content,
        scope: input.scope,
        projectId: projectId.value,
        description: input.description,
        attachMode: input.attachMode,
      },
    });
    return Result.ok(this.getState());
  }

  async addDynamicSkill(input: CreateDynamicSkillInput): Promise<Result<SkillsState>> {
    const projectId = projectIdForScope(input.scope);
    if (projectId.kind === "Error") {
      return projectId;
    }

    const definition: DynamicSkillDefinition = {
      type: "dynamic",
      id: generateID("skill-"),
      title: input.title,
      url: input.url,
      scope: input.scope,
      projectId: projectId.value,
      description: input.description,
      attachMode: input.attachMode,
    };

    const validation = validateSkillUrl(input.url);
    if (validation.valid === false) {
      return Result.err(validation.error);
    }

    const resolved = await fetchSkillContent(definition);
    if (resolved === undefined) {
      return Result.err("Failed to fetch skill content from URL");
    }

    this.resolvedCache.set(definition.id, resolved);
    await this.commit({ type: "ADD_DYNAMIC_SKILL", definition });
    return Result.ok(this.getState());
  }

  async updateStaticSkill(
    id: string,
    updates: UpdateStaticSkillInput
  ): Promise<Result<SkillsState>> {
    if (!this.model.skills.some((s) => s.id === id && s.type === "static")) {
      return Result.err("Skill not found");
    }

    const projectId = projectIdForScope(updates.scope);
    if (projectId.kind === "Error") {
      return projectId;
    }

    await this.commit({ type: "UPDATE_STATIC_SKILL", id, updates, projectId: projectId.value });
    return Result.ok(this.getState());
  }

  async updateDynamicSkill(
    id: string,
    updates: UpdateDynamicSkillInput
  ): Promise<Result<SkillsState>> {
    if (!this.model.skills.some((s) => s.id === id && s.type === "dynamic")) {
      return Result.err("Skill not found");
    }

    if (updates.url !== undefined) {
      const validation = validateSkillUrl(updates.url);
      if (validation.valid === false) {
        return Result.err(validation.error);
      }
    }

    const projectId = projectIdForScope(updates.scope);
    if (projectId.kind === "Error") {
      return projectId;
    }

    await this.commit({ type: "UPDATE_DYNAMIC_SKILL", id, updates, projectId: projectId.value });

    const updatedSkill = this.model.skills.find((s) => s.id === id);
    if (updatedSkill?.type === "dynamic") {
      await this.refreshSkill(updatedSkill);
    }
    return Result.ok(this.getState());
  }

  async removeSkill(id: string): Promise<SkillsState> {
    this.resolvedCache.delete(id);
    await this.commit({ type: "REMOVE_SKILL", id });
    return this.getState();
  }

  async setProjectOverride(input: SetProjectOverrideInput): Promise<Result<SkillsState>> {
    const projectId = requireProjectId();
    if (projectId.kind === "Error") {
      return projectId;
    }

    const skill = this.model.skills.find((s) => s.id === input.skillId);
    if (skill === undefined) {
      return Result.err("Skill not found");
    }
    if (skill.scope !== "global") {
      return Result.err("Project overrides can only be set for global skills");
    }

    await this.commit({
      type: "SET_PROJECT_OVERRIDE",
      override: {
        skillId: input.skillId,
        projectId: projectId.value,
        additionalContent: input.additionalContent,
      },
    });
    return Result.ok(this.getState());
  }

  async removeProjectOverride(skillId: string): Promise<Result<SkillsState>> {
    const projectId = requireProjectId();
    if (projectId.kind === "Error") {
      return projectId;
    }

    await this.commit({ type: "REMOVE_PROJECT_OVERRIDE", skillId, projectId: projectId.value });
    return Result.ok(this.getState());
  }

  private async refreshSkill(skill: DynamicSkillDefinition): Promise<void> {
    const resolved = await fetchSkillContent(skill);
    if (resolved !== undefined) {
      this.resolvedCache.set(skill.id, resolved);
    } else {
      this.resolvedCache.delete(skill.id);
    }
  }

  async refreshDynamicSkills(): Promise<SkillsState> {
    const dynamicSkills = this.model.skills.filter(
      (s): s is DynamicSkillDefinition => s.type === "dynamic"
    );
    await Promise.all(dynamicSkills.map((skill) => this.refreshSkill(skill)));
    return this.getState();
  }
}

export const skillsStore = new SkillsStore();
