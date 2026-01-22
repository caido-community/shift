import {
  type AgentSkill,
  type AgentSkillDefinition,
  type CreateDynamicSkillInput,
  CreateDynamicSkillSchema,
  type CreateStaticSkillInput,
  CreateStaticSkillSchema,
  type Result,
  type UpdateDynamicSkillInput,
  UpdateDynamicSkillSchema,
  type UpdateStaticSkillInput,
  UpdateStaticSkillSchema,
} from "shared";

import { getSkillsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getSkills(_sdk: BackendSDK): Result<AgentSkill[]> {
  try {
    const store = getSkillsStore();
    const skills = store.getSkills();
    return { kind: "Ok", value: skills };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export function getSkillDefinitions(_sdk: BackendSDK): Result<AgentSkillDefinition[]> {
  try {
    const store = getSkillsStore();
    const definitions = store.getSkillDefinitions();
    return { kind: "Ok", value: definitions };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function addStaticSkill(
  _sdk: BackendSDK,
  input: CreateStaticSkillInput
): Promise<Result<string>> {
  try {
    const parsed = CreateStaticSkillSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getSkillsStore();
    return await store.addStaticSkill(parsed.data);
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function addDynamicSkill(
  _sdk: BackendSDK,
  input: CreateDynamicSkillInput
): Promise<Result<string>> {
  try {
    const parsed = CreateDynamicSkillSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getSkillsStore();
    const result = await store.addDynamicSkill(parsed.data);
    if (result.kind === "Error") {
      return result;
    }
    return { kind: "Ok", value: result.value };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateStaticSkill(
  _sdk: BackendSDK,
  id: string,
  updates: UpdateStaticSkillInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateStaticSkillSchema.safeParse(updates);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getSkillsStore();
    return await store.updateStaticSkill(id, parsed.data);
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateDynamicSkill(
  _sdk: BackendSDK,
  id: string,
  updates: UpdateDynamicSkillInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateDynamicSkillSchema.safeParse(updates);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getSkillsStore();
    const result = await store.updateDynamicSkill(id, parsed.data);
    if (result.kind === "Error") {
      return result;
    }
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function removeSkill(_sdk: BackendSDK, id: string): Promise<Result<void>> {
  try {
    const store = getSkillsStore();
    await store.removeSkill(id);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function refreshSkills(_sdk: BackendSDK): Promise<Result<void>> {
  try {
    const store = getSkillsStore();
    await store.refreshDynamicSkills();
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}
