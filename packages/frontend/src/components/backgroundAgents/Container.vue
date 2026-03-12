<script setup lang="ts">
import AgentCard from "./AgentCard.vue";

import { useBackgroundAgentsStore } from "@/stores/backgroundAgents";

const store = useBackgroundAgentsStore();
</script>

<template>
  <div
    v-if="store.hasAgents"
    class="fixed top-16 right-4 z-[2900] pointer-events-none w-[min(100vw-1rem,78rem)] animate-fade-in">
    <div
      class="pointer-events-auto flex flex-row-reverse flex-wrap gap-2 max-h-[72vh] overflow-y-auto custom-scrollbar pl-2">
      <AgentCard
        v-for="agent in store.agents"
        :key="agent.id"
        :agent="agent"
        class="w-[24rem] max-w-[calc(100vw-2rem)]" />
    </div>
  </div>
</template>
