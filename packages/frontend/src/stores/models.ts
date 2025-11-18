import { defineStore } from "pinia";
import { computed } from "vue";

import {
  type ModelItem,
  type ModelUserConfig,
  type Provider,
} from "@/agents/types/config";
import { useConfigStore } from "@/stores/config";
import { defaultEnabledModels, defaultModels } from "@/stores/config/models";

export const useModelsStore = defineStore("stores.models", () => {
  const configStore = useConfigStore();

  const selectedProvider = computed<Provider>({
    get() {
      return configStore.selectedProvider;
    },
    async set(value) {
      configStore.selectedProvider = value;
      await configStore.validateAndResetModelsForProvider(value);
    },
  });

  const customModels = computed<ModelItem[]>({
    get() {
      return configStore.customModels;
    },
    set(value) {
      configStore.customModels = value;
    },
  });

  const modelConfigs = computed<Record<string, ModelUserConfig>>({
    get() {
      return configStore.modelConfigs;
    },
    set(value) {
      configStore.modelConfigs = value;
    },
  });

  const allModels = computed<ModelItem[]>(() => {
    return [...defaultModels, ...customModels.value];
  });

  const activeModels = computed<ModelItem[]>(() => {
    return allModels.value
      .map((model) => {
        const config = modelConfigs.value[model.id];
        const enabled = config
          ? config.enabled
          : defaultEnabledModels.has(model.id);
        return { ...model, enabled };
      })
      .filter(
        (model) =>
          model.provider === selectedProvider.value && model.enabled !== false,
      );
  });

  const getModel = (id: string): ModelItem | undefined => {
    return allModels.value.find((m) => m.id === id);
  };

  const addCustomModel = async (model: ModelItem) => {
    customModels.value = [...customModels.value, model];
    await configStore.saveSettings();
  };

  const removeCustomModel = async (id: string) => {
    customModels.value = customModels.value.filter((m) => m.id !== id);
    const newConfigs = { ...modelConfigs.value };
    delete newConfigs[id];
    modelConfigs.value = newConfigs;
    await configStore.validateAndResetModelsAfterRemoval(id);
  };

  const updateCustomModel = async (model: ModelItem) => {
    const index = customModels.value.findIndex((m) => m.id === model.id);
    if (index !== -1 && customModels.value[index]) {
      const oldModel = customModels.value[index];
      const newModels = [...customModels.value];
      newModels[index] = model;
      customModels.value = newModels;
      await configStore.saveSettings();

      if (oldModel.provider !== model.provider) {
        await configStore.validateAndResetModelsForProvider(
          selectedProvider.value,
        );
      }
    }
  };

  const toggleModel = async (id: string, enabled: boolean) => {
    modelConfigs.value = {
      ...modelConfigs.value,
      [id]: { id, enabled },
    };
    await configStore.saveSettings();
  };

  const setProvider = async (provider: Provider) => {
    selectedProvider.value = provider;
    await configStore.validateAndResetModelsForProvider(provider);
  };

  return {
    selectedProvider,
    customModels,
    modelConfigs,
    defaultModels,
    allModels,
    activeModels,
    getModel,
    addCustomModel,
    removeCustomModel,
    updateCustomModel,
    toggleModel,
    setProvider,
  };
});
