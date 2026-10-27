import {
  type AgentSkill,
  type AgentSkillDefinition,
  type CreateDynamicSkillInput,
  CreateDynamicSkillSchema,
  type CreateStaticSkillInput,
  CreateStaticSkillSchema,
  type LegacyCollectionAutoRunMigrationSummary,
  type ProjectSkillOverride,
  Result,
  type SetProjectOverrideInput,
  SetProjectOverrideSchema,
  type SkillsState,
  type UpdateDynamicSkillInput,
  UpdateDynamicSkillSchema,
  type UpdateStaticSkillInput,
  UpdateStaticSkillSchema,
} from "shared";

import { skillsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getSkills(_sdk: BackendSDK): Result<AgentSkill[]> {
  try {
    return Result.ok(skillsStore.getSkills());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export function getSkillDefinitions(_sdk: BackendSDK): Result<AgentSkillDefinition[]> {
  try {
    return Result.ok(skillsStore.getSkillDefinitions());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export function getLegacyCollectionAutoRunMigrationSummary(
  _sdk: BackendSDK
): Result<LegacyCollectionAutoRunMigrationSummary> {
  try {
    return Result.ok(skillsStore.getLegacyCollectionAutoRunMigrationSummary());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function addStaticSkill(
  _sdk: BackendSDK,
  input: CreateStaticSkillInput
): Promise<Result<SkillsState>> {
  try {
    const parsed = CreateStaticSkillSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await skillsStore.addStaticSkill(parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function addDynamicSkill(
  _sdk: BackendSDK,
  input: CreateDynamicSkillInput
): Promise<Result<SkillsState>> {
  try {
    const parsed = CreateDynamicSkillSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await skillsStore.addDynamicSkill(parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function updateStaticSkill(
  _sdk: BackendSDK,
  id: string,
  updates: UpdateStaticSkillInput
): Promise<Result<SkillsState>> {
  try {
    const parsed = UpdateStaticSkillSchema.safeParse(updates);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await skillsStore.updateStaticSkill(id, parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function updateDynamicSkill(
  _sdk: BackendSDK,
  id: string,
  updates: UpdateDynamicSkillInput
): Promise<Result<SkillsState>> {
  try {
    const parsed = UpdateDynamicSkillSchema.safeParse(updates);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await skillsStore.updateDynamicSkill(id, parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function removeSkill(_sdk: BackendSDK, id: string): Promise<Result<SkillsState>> {
  try {
    return Result.ok(await skillsStore.removeSkill(id));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function refreshSkills(_sdk: BackendSDK): Promise<Result<SkillsState>> {
  try {
    return Result.ok(await skillsStore.refreshDynamicSkills());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export function getProjectOverride(
  _sdk: BackendSDK,
  skillId: string
): Result<ProjectSkillOverride | undefined> {
  try {
    return Result.ok(skillsStore.getProjectOverride(skillId));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function setProjectOverride(
  _sdk: BackendSDK,
  input: SetProjectOverrideInput
): Promise<Result<SkillsState>> {
  try {
    const parsed = SetProjectOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await skillsStore.setProjectOverride(parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function removeProjectOverride(
  _sdk: BackendSDK,
  skillId: string
): Promise<Result<SkillsState>> {
  try {
    return await skillsStore.removeProjectOverride(skillId);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}
