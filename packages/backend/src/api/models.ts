import {
  type AddModelInput,
  AddModelSchema,
  type ModelsConfig,
  type RemoveModelInput,
  RemoveModelSchema,
  type Result,
  type UpdateModelConfigInput,
  UpdateModelConfigSchema,
  type UpdateModelEnabledForInput,
  UpdateModelEnabledForSchema,
} from "shared";

import { getModelsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getModelsConfig(_sdk: BackendSDK): Result<ModelsConfig> {
  try {
    const store = getModelsStore();
    const config = store.getFullConfig();
    return { kind: "Ok", value: config };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function addModel(_sdk: BackendSDK, input: AddModelInput): Promise<Result<void>> {
  try {
    const parsed = AddModelSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getModelsStore();
    await store.addModel(parsed.data);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function removeModel(
  _sdk: BackendSDK,
  input: RemoveModelInput
): Promise<Result<void>> {
  try {
    const parsed = RemoveModelSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getModelsStore();
    await store.removeModel(parsed.data.provider, parsed.data.id);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateModelConfig(
  _sdk: BackendSDK,
  key: string,
  input: UpdateModelConfigInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateModelConfigSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getModelsStore();
    await store.updateModelConfig(key, parsed.data);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateModelEnabledFor(
  _sdk: BackendSDK,
  key: string,
  input: UpdateModelEnabledForInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateModelEnabledForSchema.safeParse(input);
    if (!parsed.success) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getModelsStore();
    await store.updateModelEnabledFor(key, parsed.data.enabledFor);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}
