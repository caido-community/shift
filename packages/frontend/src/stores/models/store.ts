import { defineStore } from "pinia";
import { createModelKey, type ModelProvider, type ModelUsageType } from "shared";
import { computed, readonly, ref } from "vue";

import { fetchModelsConfig } from "./store.effects";
import { initialModel, type ModelsMessage, type ModelsModel } from "./store.model";
import { update } from "./store.update";

import { useSDK } from "@/plugins/sdk";

export const useModelsStore = defineStore("models", () => {
  const sdk = useSDK();
  const model = ref<ModelsModel>(initialModel);

  function dispatch(message: ModelsMessage) {
    model.value = update(model.value, message);
  }

  const config = computed(() => model.value.config);
  const isLoading = computed(() => model.value.isLoading);
  const error = computed(() => model.value.error);
  const models = computed(() => model.value.config?.models ?? []);
  const customModelKeys = computed(() => new Set(model.value.config?.customModelKeys ?? []));

  const getModelByKey = (key: string) =>
    models.value.find((m) => createModelKey(m.provider, m.id) === key);

  const getEnabledModels = ({
    provider,
    usageType,
  }: {
    provider?: ModelProvider;
    usageType?: ModelUsageType;
  } = {}) => {
    return models.value.filter((m) => {
      if (provider !== undefined && m.provider !== provider) {
        return false;
      }

      const key = createModelKey(m.provider, m.id);
      const modelConfig = model.value.config?.config[key];

      if (modelConfig === undefined) {
        return false;
      }

      if (!modelConfig.enabled) {
        return false;
      }

      if (usageType !== undefined && !modelConfig.enabledFor.includes(usageType)) {
        return false;
      }

      return true;
    });
  };

  async function initialize() {
    await fetchModelsConfig(sdk, dispatch);
  }

  return {
    state: readonly(model),
    sdk,
    dispatch,
    config,
    isLoading,
    error,
    models,
    customModelKeys,
    getModelByKey,
    getEnabledModels,
    initialize,
  };
});
