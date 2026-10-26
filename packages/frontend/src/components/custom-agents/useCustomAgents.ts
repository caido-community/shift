import type { CreateCustomAgentInput, CustomAgent, Result, UpdateCustomAgentInput } from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";

export const useCustomAgents = () => {
  const sdk = useSDK();
  const customAgentsStore = useCustomAgentsStore();

  const form = ref<{ agent: CustomAgent | undefined }>();

  const definitions = computed(() => customAgentsStore.definitions);
  const isLoading = computed(() => customAgentsStore.isLoading);

  const openForm = (agent?: CustomAgent) => {
    form.value = { agent };
  };

  const closeForm = () => {
    form.value = undefined;
  };

  const handleMutationResult = (result: Result<void>) => {
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    closeForm();
  };

  const handleAdd = async (input: CreateCustomAgentInput) => {
    handleMutationResult(await customAgentsStore.add(input));
  };

  const handleUpdate = async (id: string, input: UpdateCustomAgentInput) => {
    handleMutationResult(await customAgentsStore.update(id, input));
  };

  const handleDelete = async (id: string) => {
    const result = await customAgentsStore.remove(id);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  return {
    definitions,
    isLoading,
    form,
    openForm,
    closeForm,
    handleAdd,
    handleUpdate,
    handleDelete,
  };
};
