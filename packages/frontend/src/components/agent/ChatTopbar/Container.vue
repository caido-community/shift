<script setup lang="ts">
import { useAgentsStore } from "@/stores/agents";
import { useUIStore } from "@/stores/ui";

const uiStore = useUIStore();
const agentStore = useAgentsStore();

const closeDrawer = () => {
  uiStore.toggleDrawer();
};

const clearConversation = () => {
  if (agentStore.selectedAgent) {
    agentStore.selectedAgent.messages = [];
    agentStore.selectedToolContext?.todoManager.clearTodos();
  }
};
</script>

<template>
  <div class="h-10 p-2">
    <div class="flex items-center justify-end h-full">
      <div class="flex items-center gap-2">
        <i
          v-tooltip.bottom="'Clear conversation'"
          class="fas fa-trash text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-sm"
          :class="{
            'opacity-50 cursor-not-allowed': !agentStore.selectedAgent,
          }"
          @click="clearConversation"
        />
        <i
          v-tooltip.bottom="'Close'"
          class="fas fa-times text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-sm"
          @click="closeDrawer"
        />
      </div>
    </div>
  </div>
</template>
