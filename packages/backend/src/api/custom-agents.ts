import {
  type CreateCustomAgentInput,
  CreateCustomAgentSchema,
  type CustomAgent,
  type CustomAgentsState,
  type ResolvedCustomAgent,
  Result,
  type UpdateCustomAgentInput,
  UpdateCustomAgentSchema,
} from "shared";

import { customAgentsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getResolvedCustomAgents(_sdk: BackendSDK): Result<ResolvedCustomAgent[]> {
  try {
    return Result.ok(customAgentsStore.getResolvedAgents());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export function getCustomAgentDefinitions(_sdk: BackendSDK): Result<CustomAgent[]> {
  try {
    return Result.ok(customAgentsStore.getAgentDefinitions());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function addCustomAgent(
  _sdk: BackendSDK,
  input: CreateCustomAgentInput
): Promise<Result<CustomAgentsState>> {
  try {
    const parsed = CreateCustomAgentSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await customAgentsStore.addAgent(parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function updateCustomAgent(
  _sdk: BackendSDK,
  id: string,
  updates: UpdateCustomAgentInput
): Promise<Result<CustomAgentsState>> {
  try {
    const parsed = UpdateCustomAgentSchema.safeParse(updates);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return await customAgentsStore.updateAgent(id, parsed.data);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function removeCustomAgent(
  _sdk: BackendSDK,
  id: string
): Promise<Result<CustomAgentsState>> {
  try {
    return Result.ok(await customAgentsStore.removeAgent(id));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}
