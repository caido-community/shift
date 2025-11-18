import { computed, ref } from "vue";

import { type ModelItem, Provider } from "@/agents/types/config";
import { defaultEnabledModels } from "@/stores/config/models";
import { useModelsStore } from "@/stores/models";

export const useModels = () => {
  const modelsStore = useModelsStore();
  const searchQuery = ref("");
  const isAddModalVisible = ref(false);

  const providers = Object.values(Provider).map((p) => ({
    label: p,
    value: p,
  }));

  const selectedProvider = computed({
    get: () => modelsStore.selectedProvider,
    set: (value) => {
      modelsStore.selectedProvider = value;
    },
  });

  const models = computed(() => {
    const providerModels = modelsStore.allModels.filter(
      (m) => m.provider === modelsStore.selectedProvider,
    );

    return providerModels.map((model) => {
      const config = modelsStore.modelConfigs[model.id];
      const enabled = config
        ? config.enabled
        : defaultEnabledModels.has(model.id);
      return { ...model, enabled };
    });
  });

  const filteredModels = computed(() => {
    if (!searchQuery.value.trim()) return models.value;
    const query = searchQuery.value.toLowerCase();
    return models.value.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query),
    );
  });

  const toggleModel = async (model: ModelItem & { enabled?: boolean }) => {
    await modelsStore.toggleModel(model.id, model.enabled !== true);
  };

  const addCustomModel = async (model: ModelItem) => {
    await modelsStore.addCustomModel(model);
    isAddModalVisible.value = false;
  };

  const isCustomModel = (modelId: string) => {
    return modelsStore.customModels.some((m) => m.id === modelId);
  };

  const deleteModel = async (modelId: string) => {
    await modelsStore.removeCustomModel(modelId);
  };

  return {
    modelsStore,
    searchQuery,
    isAddModalVisible,
    filteredModels,
    toggleModel,
    addCustomModel,
    isCustomModel,
    deleteModel,
    providers,
    selectedProvider,
  };
};
