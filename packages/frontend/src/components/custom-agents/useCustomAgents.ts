import type { CreateCustomAgentInput, CustomAgent, Result, UpdateCustomAgentInput } from "shared";
import { computed, ref } from "vue";

import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import {
  addCustomAgent,
  removeCustomAgent,
  updateCustomAgent,
} from "@/stores/custom-agents/store.effects";

type ViewState = "list" | "add" | "edit";

export const useCustomAgents = () => {
  const customAgentsStore = useCustomAgentsStore();
  const { sdk, dispatch } = customAgentsStore;

  const view = ref<ViewState>("list");
  const editingAgent = ref<CustomAgent | undefined>(undefined);

  const definitions = computed(() => customAgentsStore.definitions);
  const isLoading = computed(() => customAgentsStore.isLoading);

  const openAddView = () => {
    editingAgent.value = undefined;
    view.value = "add";
  };

  const openEditView = (agent: CustomAgent) => {
    editingAgent.value = agent;
    view.value = "edit";
  };

  const closeForm = () => {
    view.value = "list";
    editingAgent.value = undefined;
  };

  const handleMutationResult = (result: Result<void>) => {
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    closeForm();
  };

  const handleAdd = async (input: CreateCustomAgentInput) => {
    handleMutationResult(await addCustomAgent(sdk, dispatch, input));
  };

  const handleUpdate = async (id: string, input: UpdateCustomAgentInput) => {
    handleMutationResult(await updateCustomAgent(sdk, dispatch, id, input));
  };

  const handleDelete = async (id: string) => {
    const result = await removeCustomAgent(sdk, dispatch, id);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  };

  return {
    definitions,
    isLoading,
    view,
    editingAgent,
    openAddView,
    openEditView,
    closeForm,
    handleAdd,
    handleUpdate,
    handleDelete,
  };
};
