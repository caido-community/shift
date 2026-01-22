import {
  type ConfigOverride,
  createModelKey,
  type Model,
  type ModelProvider,
  type ModelsConfig,
  type ModelsUserData,
  type ModelUsageType,
  type ModelUserConfig,
} from "shared";

import {
  anthropicModels,
  defaultAnthropicModelsConfig,
  defaultGoogleModelsConfig,
  defaultOpenAIModelsConfig,
  defaultOpenRouterModelsConfig,
  googleModels,
  openaiModels,
  openrouterModels,
} from "../../models";

export type ModelsModel = ModelsUserData;

export type ModelsMessage =
  | { type: "ADD_MODEL"; model: Model }
  | { type: "REMOVE_MODEL"; provider: ModelProvider; id: string }
  | { type: "UPDATE_CONFIG"; key: string; config: Partial<ConfigOverride> }
  | { type: "UPDATE_ENABLED_FOR"; key: string; enabledFor: ModelUsageType[] };

const builtInModels: Model[] = [
  ...anthropicModels,
  ...googleModels,
  ...openaiModels,
  ...openrouterModels,
];

const defaultModelsConfig: Record<string, ModelUsageType[]> = {
  ...defaultAnthropicModelsConfig,
  ...defaultGoogleModelsConfig,
  ...defaultOpenAIModelsConfig,
  ...defaultOpenRouterModelsConfig,
};

export function createInitialModel(): ModelsModel {
  return {
    customModels: [],
    configOverrides: {},
  };
}

export function getBuiltInModelKeys(): Set<string> {
  return new Set(builtInModels.map((m) => createModelKey(m.provider, m.id)));
}

export function computeRuntimeConfig(userData: ModelsUserData): ModelsConfig {
  const allModels = [...builtInModels, ...userData.customModels];
  const config: Record<string, ModelUserConfig> = {};

  for (const model of allModels) {
    const key = createModelKey(model.provider, model.id);
    const defaultEnabledFor = defaultModelsConfig[model.id] ?? [];
    const override = userData.configOverrides[key];

    const enabled = override?.enabled ?? defaultEnabledFor.length > 0;
    const enabledFor = override?.enabledFor ?? defaultEnabledFor;

    config[key] = {
      modelKey: key,
      enabled,
      enabledFor,
    };
  }

  const customModelKeys = userData.customModels.map((m) => createModelKey(m.provider, m.id));

  return {
    models: allModels,
    config,
    customModelKeys,
  };
}
