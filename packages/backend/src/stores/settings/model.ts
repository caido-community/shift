import {
  defaultSettingsConfig,
  type RenamingConfig,
  type SettingsConfig,
  type UpdateSettingsInput,
} from "shared";

export type SettingsModel = SettingsConfig;

export type SettingsMessage =
  | { type: "UPDATE_SETTINGS"; input: UpdateSettingsInput }
  | { type: "UPDATE_RENAMING"; input: Partial<RenamingConfig> };

export function createInitialModel(): SettingsModel {
  return { ...defaultSettingsConfig };
}
