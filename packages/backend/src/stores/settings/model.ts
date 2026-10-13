import {
  DEFAULT_MAX_ITERATIONS,
  defaultSettingsConfig,
  type RenamingConfig,
  type SettingsConfig,
  type UpdateSettingsInput,
} from "shared";

import { isRecord } from "../../utils";

export type SettingsModel = SettingsConfig;

export type SettingsMessage =
  | { type: "UPDATE_SETTINGS"; input: UpdateSettingsInput }
  | { type: "UPDATE_RENAMING"; input: Partial<RenamingConfig> };

export function createInitialModel(): SettingsModel {
  return { ...defaultSettingsConfig };
}

const LEGACY_DEFAULT_MAX_ITERATIONS = 100;

// shortcut: 100 can never be kept, it is raised on every load; add a settings version if that matters.
export function migrateLoadedSettings(loaded: unknown): unknown {
  if (isRecord(loaded) && loaded.maxIterations === LEGACY_DEFAULT_MAX_ITERATIONS) {
    return { ...loaded, maxIterations: DEFAULT_MAX_ITERATIONS };
  }
  return loaded;
}
