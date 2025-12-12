import { ref, watch } from "vue";

import { type ModelItem, Provider } from "@/agents/types/config";
import { useModelsStore } from "@/stores/models";

export const useForm = (
  onAdd: (model: ModelItem) => void,
  close: () => void,
) => {
  const modelsStore = useModelsStore();

  const name = ref("");
  const id = ref("");
  const isReasoningModel = ref(false);
  const provider = ref(modelsStore.selectedProvider);

  const providers = Object.values(Provider).map((p) => ({
    label: p,
    value: p,
  }));

  watch(
    () => modelsStore.selectedProvider,
    (newProvider) => {
      provider.value = newProvider;
    },
  );

  const resetForm = () => {
    name.value = "";
    id.value = "";
    isReasoningModel.value = false;
    provider.value = modelsStore.selectedProvider;
  };

  const handleSave = () => {
    if (!name.value.trim() || !id.value.trim()) return;

    const model: ModelItem = {
      name: name.value.trim(),
      id: id.value.trim(),
      provider: provider.value,
      isReasoningModel: isReasoningModel.value,
    };

    onAdd(model);
    resetForm();
    close();
  };

  const handleCancel = () => {
    close();
    resetForm();
  };

  return {
    name,
    id,
    isReasoningModel,
    provider,
    providers,
    handleSave,
    handleCancel,
  };
};
