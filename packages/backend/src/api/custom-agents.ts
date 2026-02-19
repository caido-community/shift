import {
  type CreateCustomAgentInput,
  CreateCustomAgentSchema,
  type CustomAgent,
  type ResolvedCustomAgent,
  type Result,
  type UpdateCustomAgentInput,
  UpdateCustomAgentSchema,
} from "shared";

import { getCustomAgentsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getResolvedCustomAgents(_sdk: BackendSDK): Result<ResolvedCustomAgent[]> {
  try {
    const store = getCustomAgentsStore();
    const agents = store.getResolvedAgents();
    return { kind: "Ok", value: agents };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export function getCustomAgentDefinitions(_sdk: BackendSDK): Result<CustomAgent[]> {
  try {
    const store = getCustomAgentsStore();
    const definitions = store.getAgentDefinitions();
    return { kind: "Ok", value: definitions };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function addCustomAgent(
  _sdk: BackendSDK,
  input: CreateCustomAgentInput
): Promise<Result<string>> {
  try {
    const parsed = CreateCustomAgentSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getCustomAgentsStore();
    return await store.addAgent(parsed.data);
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateCustomAgent(
  _sdk: BackendSDK,
  id: string,
  updates: UpdateCustomAgentInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateCustomAgentSchema.safeParse(updates);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getCustomAgentsStore();
    return await store.updateAgent(id, parsed.data);
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function removeCustomAgent(_sdk: BackendSDK, id: string): Promise<Result<void>> {
  try {
    const store = getCustomAgentsStore();
    await store.removeAgent(id);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}
