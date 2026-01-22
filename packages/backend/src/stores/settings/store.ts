import { type RenamingConfig, type SettingsConfig, type UpdateSettingsInput } from "shared";

import { GlobalStore } from "../global-store";

import { createInitialModel, type SettingsMessage, type SettingsModel } from "./model";
import { update } from "./update";

class SettingsStore extends GlobalStore<SettingsModel, SettingsMessage> {
  constructor() {
    super("settings");
  }

  protected createInitialModel(): SettingsModel {
    return createInitialModel();
  }

  protected update(model: SettingsModel, message: SettingsMessage): SettingsModel {
    return update(model, message);
  }

  getSettings(): SettingsConfig {
    return this.getModel();
  }

  async updateSettings(input: UpdateSettingsInput): Promise<void> {
    this.dispatch({ type: "UPDATE_SETTINGS", input });
    await this.persist();
    this.notify();
  }

  async updateRenaming(input: Partial<RenamingConfig>): Promise<void> {
    this.dispatch({ type: "UPDATE_RENAMING", input });
    await this.persist();
    this.notify();
  }
}

let instance: SettingsStore | undefined;

export function getSettingsStore(): SettingsStore {
  if (instance === undefined) {
    instance = new SettingsStore();
  }
  return instance;
}
