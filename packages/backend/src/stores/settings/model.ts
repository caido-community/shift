import {
  DEFAULT_MAX_ITERATIONS,
  defaultSettingsConfig,
  type SettingsConfig,
  type UpdateSettingsInput,
} from "shared";

import { isRecord } from "../../utils";

export type SettingsModel = SettingsConfig;

export type SettingsMessage = { type: "UPDATE_SETTINGS"; input: UpdateSettingsInput };

export function createInitialModel(): SettingsModel {
  return { ...defaultSettingsConfig };
}

const LEGACY_DEFAULT_MAX_ITERATIONS = 100;

export function parseStoredSettings(loaded: unknown): SettingsModel | undefined {
  if (!isRecord(loaded)) {
    return undefined;
  }

  const defaults = createInitialModel();
  const settings = { ...defaults, ...loaded } as SettingsModel;
  settings.renaming = { ...defaults.renaming, ...settings.renaming };
  settings.featureFlags = { ...defaults.featureFlags, ...settings.featureFlags };

  if (settings.maxIterations === LEGACY_DEFAULT_MAX_ITERATIONS) {
    settings.maxIterations = DEFAULT_MAX_ITERATIONS;
  }

  return settings;
}
