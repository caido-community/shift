<script setup lang="ts">
import { computed } from "vue";

import { useSession } from "../../useSession";
import OptionSelector from "../OptionSelector.vue";

import { useCustomAgentsStore } from "@/stores/custom-agents/store";

const NO_AGENT = "";

const customAgentsStore = useCustomAgentsStore();
const session = useSession();

const options = computed(() => [
  { value: NO_AGENT, label: "No Agent" },
  ...customAgentsStore.agents.map((agent) => ({
    value: agent.id,
    label: agent.name,
    description: agent.description,
  })),
]);

const selected = computed(() => {
  const id = session.store.selectedCustomAgentId;
  return id !== undefined && customAgentsStore.getAgentById(id) !== undefined ? id : NO_AGENT;
});

const selectAgent = (agentId: string) => {
  const agent = customAgentsStore.getAgentById(agentId);
  if (agent === undefined) {
    session.store.clearCustomAgent();
  } else {
    session.store.setCustomAgent(agent);
  }
};
</script>

<template>
  <OptionSelector
    v-if="customAgentsStore.agents.length > 0"
    :options="options"
    :selected="selected"
    :muted="selected === NO_AGENT"
    @select="selectAgent" />
</template>
