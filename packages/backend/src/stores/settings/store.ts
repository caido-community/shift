import type { SettingsConfig, UpdateSettingsInput } from "shared";

import { Store } from "../store";

import {
  createInitialModel,
  parseStoredSettings,
  type SettingsMessage,
  type SettingsModel,
} from "./model";
import { update } from "./update";

class SettingsStore extends Store<SettingsModel, SettingsMessage> {
  constructor() {
    super({ filename: "settings", initialModel: createInitialModel, update });
  }

  protected parse(loaded: unknown): SettingsModel | undefined {
    return parseStoredSettings(loaded);
  }

  getSettings(): SettingsConfig {
    return this.model;
  }

  updateSettings(input: UpdateSettingsInput): Promise<SettingsConfig> {
    return this.commit({ type: "UPDATE_SETTINGS", input });
  }
}

export const settingsStore = new SettingsStore();
