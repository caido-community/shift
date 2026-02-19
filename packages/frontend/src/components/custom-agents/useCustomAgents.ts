import type { CreateCustomAgentInput, CustomAgent, UpdateCustomAgentInput } from "shared";
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

  const handleAdd = async (input: CreateCustomAgentInput) => {
    const result = await addCustomAgent(sdk, dispatch, input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    closeForm();
  };

  const handleUpdate = async (id: string, input: UpdateCustomAgentInput) => {
    const result = await updateCustomAgent(sdk, dispatch, id, input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    closeForm();
  };

  const handleDelete = async (id: string) => {
    await removeCustomAgent(sdk, dispatch, id);
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
