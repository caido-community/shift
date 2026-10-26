import {
  Result,
  type SettingsConfig,
  type UpdateSettingsInput,
  UpdateSettingsSchema,
} from "shared";

import { settingsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getSettings(_sdk: BackendSDK): Result<SettingsConfig> {
  try {
    return Result.ok(settingsStore.getSettings());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function updateSettings(
  _sdk: BackendSDK,
  input: UpdateSettingsInput
): Promise<Result<SettingsConfig>> {
  try {
    const parsed = UpdateSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return Result.ok(await settingsStore.updateSettings(parsed.data));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}
