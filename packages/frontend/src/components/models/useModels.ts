import { createModelKey, type Model, ModelProvider } from "shared";
import { computed, ref } from "vue";

import { useModelsStore } from "@/stores/models";
import {
  addModel,
  removeModel,
  updateModelConfig,
  updateModelEnabledFor,
} from "@/stores/models/store.effects";

type ModelWithConfig = Model & {
  enabled: boolean;
  enabledForFloat: boolean;
  enabledForAgent: boolean;
};

export const useModels = () => {
  const modelsStore = useModelsStore();
  const { sdk, dispatch } = modelsStore;

  const searchQuery = ref("");
  const isAddModalVisible = ref(false);
  const selectedProvider = ref<ModelProvider>(ModelProvider.OpenRouter);

  const providers = Object.values(ModelProvider).map((p) => ({
    label: p,
    value: p,
  }));

  const models = computed<ModelWithConfig[]>(() => {
    const providerModels = modelsStore.models.filter((m) => m.provider === selectedProvider.value);

    return providerModels.map((model) => {
      const key = createModelKey(model.provider, model.id);
      const config = modelsStore.config?.config[key];
      const enabled = config?.enabled ?? false;
      const enabledForFloat = config?.enabledFor.includes("float") ?? false;
      const enabledForAgent = config?.enabledFor.includes("agent") ?? false;
      return { ...model, enabled, enabledForFloat, enabledForAgent };
    });
  });

  const filteredModels = computed(() => {
    const query = searchQuery.value.trim();
    if (query === "") return models.value;
    const lowerQuery = query.toLowerCase();
    return models.value.filter(
      (m) => m.name.toLowerCase().includes(lowerQuery) || m.id.toLowerCase().includes(lowerQuery)
    );
  });

  const toggleModel = async (model: ModelWithConfig) => {
    const key = createModelKey(model.provider, model.id);
    await updateModelConfig(sdk, dispatch, key, { enabled: model.enabled !== true });
  };

  const toggleModelForFloat = async (model: ModelWithConfig) => {
    const key = createModelKey(model.provider, model.id);
    const config = modelsStore.config?.config[key];
    const currentEnabledFor = config?.enabledFor ?? [];
    const newEnabledFor = model.enabledForFloat
      ? currentEnabledFor.filter((t) => t !== "float")
      : [...currentEnabledFor, "float" as const];

    await updateModelEnabledFor(sdk, dispatch, key, { enabledFor: newEnabledFor });
  };

  const toggleModelForAgent = async (model: ModelWithConfig) => {
    const key = createModelKey(model.provider, model.id);
    const config = modelsStore.config?.config[key];
    const currentEnabledFor = config?.enabledFor ?? [];
    const newEnabledFor = model.enabledForAgent
      ? currentEnabledFor.filter((t) => t !== "agent")
      : [...currentEnabledFor, "agent" as const];

    await updateModelEnabledFor(sdk, dispatch, key, { enabledFor: newEnabledFor });
  };

  const addCustomModel = async (model: Model) => {
    await addModel(sdk, dispatch, model);
    isAddModalVisible.value = false;
  };

  const isCustomModel = (model: Model) => {
    const key = createModelKey(model.provider, model.id);
    return modelsStore.customModelKeys.has(key);
  };

  const deleteModel = async (model: Model) => {
    await removeModel(sdk, dispatch, {
      provider: model.provider,
      id: model.id,
    });
  };

  return {
    searchQuery,
    isAddModalVisible,
    filteredModels,
    toggleModel,
    toggleModelForFloat,
    toggleModelForAgent,
    addCustomModel,
    isCustomModel,
    deleteModel,
    providers,
    selectedProvider,
  };
};
