import {
  type ConfigOverride,
  type Model,
  type ModelProvider,
  type ModelsConfig,
  type ModelUsageType,
  type ModelUserConfig,
} from "shared";

import { GlobalStore } from "../global-store";

import {
  computeRuntimeConfig,
  createInitialModel,
  type ModelsMessage,
  type ModelsModel,
} from "./model";
import { update } from "./update";

class ModelsStore extends GlobalStore<ModelsModel, ModelsMessage> {
  constructor() {
    super("models");
  }

  protected createInitialModel(): ModelsModel {
    return createInitialModel();
  }

  protected update(model: ModelsModel, message: ModelsMessage): ModelsModel {
    return update(model, message);
  }

  private getRuntimeConfig(): ModelsConfig {
    return computeRuntimeConfig(this.getModel());
  }

  getModels(): Model[] {
    return this.getRuntimeConfig().models;
  }

  getConfig(): Record<string, ModelUserConfig> {
    return this.getRuntimeConfig().config;
  }

  getFullConfig(): ModelsConfig {
    return this.getRuntimeConfig();
  }

  async addModel(model: Model): Promise<void> {
    this.dispatch({ type: "ADD_MODEL", model });
    await this.persist();
    this.notify();
  }

  async removeModel(provider: ModelProvider, id: string): Promise<void> {
    this.dispatch({ type: "REMOVE_MODEL", provider, id });
    await this.persist();
    this.notify();
  }

  async updateModelConfig(key: string, config: Partial<ConfigOverride>): Promise<void> {
    this.dispatch({ type: "UPDATE_CONFIG", key, config });
    await this.persist();
    this.notify();
  }

  async updateModelEnabledFor(key: string, enabledFor: ModelUsageType[]): Promise<void> {
    this.dispatch({ type: "UPDATE_ENABLED_FOR", key, enabledFor });
    await this.persist();
    this.notify();
  }
}

let instance: ModelsStore | undefined;

export function getModelsStore(): ModelsStore {
  if (instance === undefined) {
    instance = new ModelsStore();
  }
  return instance;
}
