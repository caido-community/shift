import {
  type RenamingConfig,
  type Result,
  type SettingsConfig,
  type UpdateSettingsInput,
  UpdateSettingsSchema,
} from "shared";

import { getSettingsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getSettings(_sdk: BackendSDK): Result<SettingsConfig> {
  try {
    const store = getSettingsStore();
    const settings = store.getSettings();
    return { kind: "Ok", value: settings };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateSettings(
  _sdk: BackendSDK,
  input: UpdateSettingsInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateSettingsSchema.safeParse(input);
    if (parsed.success === false) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getSettingsStore();
    await store.updateSettings(parsed.data);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateRenaming(
  _sdk: BackendSDK,
  input: Partial<RenamingConfig>
): Promise<Result<void>> {
  try {
    const store = getSettingsStore();
    await store.updateRenaming(input);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}
