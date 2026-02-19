import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";

import { fetchCustomAgents } from "./store.effects";
import { type CustomAgentsMessage, type CustomAgentsModel, initialModel } from "./store.model";
import { update } from "./store.update";

import { useSDK } from "@/plugins/sdk";

export const useCustomAgentsStore = defineStore("customAgents", () => {
  const sdk = useSDK();
  const model = ref<CustomAgentsModel>(initialModel);

  function dispatch(message: CustomAgentsMessage) {
    model.value = update(model.value, message);
  }

  const definitions = computed(() => model.value.definitions);
  const agents = computed(() => model.value.agents);
  const isLoading = computed(() => model.value.isLoading);
  const error = computed(() => model.value.error);

  const getAgentById = (id: string) => agents.value.find((a) => a.id === id);

  const getDefinitionById = (id: string) => definitions.value.find((d) => d.id === id);

  async function initialize() {
    await fetchCustomAgents(sdk, dispatch);
  }

  return {
    state: readonly(model),
    sdk,
    dispatch,
    definitions,
    agents,
    isLoading,
    error,
    getAgentById,
    getDefinitionById,
    initialize,
  };
});
