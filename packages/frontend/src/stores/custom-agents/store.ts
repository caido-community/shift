import { defineStore } from "pinia";
import {
  type CreateCustomAgentInput,
  type CustomAgentsState,
  Result,
  type UpdateCustomAgentInput,
} from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";

export const useCustomAgentsStore = defineStore("customAgents", () => {
  const sdk = useSDK();
  const state = ref<CustomAgentsState>({ definitions: [], agents: [] });
  const isLoading = ref(false);

  async function initialize() {
    isLoading.value = true;
    const [definitions, agents] = await Promise.all([
      sdk.backend.getCustomAgentDefinitions(),
      sdk.backend.getResolvedCustomAgents(),
    ]);
    if (definitions.kind === "Ok" && agents.kind === "Ok") {
      state.value = { definitions: definitions.value, agents: agents.value };
    }
    isLoading.value = false;
  }

  async function add(input: CreateCustomAgentInput): Promise<Result<void>> {
    const result = await sdk.backend.addCustomAgent(input);
    if (result.kind === "Error") return result;
    state.value = result.value;
    return Result.ok(undefined);
  }

  async function update(id: string, input: UpdateCustomAgentInput): Promise<Result<void>> {
    const result = await sdk.backend.updateCustomAgent(id, input);
    if (result.kind === "Error") return result;
    state.value = result.value;
    return Result.ok(undefined);
  }

  async function remove(id: string): Promise<Result<void>> {
    const result = await sdk.backend.removeCustomAgent(id);
    if (result.kind === "Error") return result;
    state.value = result.value;
    return Result.ok(undefined);
  }

  return {
    definitions: computed(() => state.value.definitions),
    agents: computed(() => state.value.agents),
    isLoading: computed(() => isLoading.value),
    getAgentById: (id: string) => state.value.agents.find((agent) => agent.id === id),
    initialize,
    add,
    update,
    remove,
  };
});
