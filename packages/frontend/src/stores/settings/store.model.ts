import type { RenamingConfig, SettingsConfig, UpdateSettingsInput } from "shared";

export type SettingsModel = {
  config: SettingsConfig | undefined;
  isLoading: boolean;
  error: string | undefined;
};

export const initialModel: SettingsModel = {
  config: undefined,
  isLoading: false,
  error: undefined,
};

export type SettingsMessage =
  | { type: "FETCH_REQUEST" }
  | { type: "FETCH_SUCCESS"; config: SettingsConfig }
  | { type: "FETCH_FAILURE"; error: string }
  | { type: "UPDATE_REQUEST"; input: UpdateSettingsInput }
  | { type: "UPDATE_SUCCESS"; input: UpdateSettingsInput }
  | { type: "UPDATE_FAILURE"; error: string }
  | { type: "UPDATE_RENAMING_REQUEST"; input: Partial<RenamingConfig> }
  | { type: "UPDATE_RENAMING_SUCCESS"; input: Partial<RenamingConfig> }
  | { type: "UPDATE_RENAMING_FAILURE"; error: string };
