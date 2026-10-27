<script setup lang="ts">
import { ref } from "vue";

import { useTopbar } from "./useTopbar";

import { hint } from "@/components/agent/ChatInput/ModelSelector/tooltip";
import { Confirmation } from "@/components/common/Confirmation";

const {
  hasMessages,
  clearConversation,
  debugMode,
  debugToolsEnabled,
  toggleDebugMode,
  closeDrawer,
  copyAgentState,
} = useTopbar();

const showClearDialog = ref(false);
</script>

<template>
  <div class="flex items-center justify-end gap-2 h-8">
    <div class="flex items-center gap-2">
      <i
        v-if="debugToolsEnabled"
        v-tooltip.left="hint('Toggle debug view')"
        :class="[
          'fas fa-bug cursor-pointer p-1 text-xs transition-colors',
          debugMode
            ? 'text-yellow-400 hover:text-yellow-300'
            : 'text-surface-400 hover:text-surface-200',
        ]"
        @click="toggleDebugMode" />
      <i
        v-if="debugToolsEnabled"
        v-tooltip.left="hint('Copy agent state')"
        class="fas fa-copy text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-xs"
        @click="copyAgentState" />
      <i
        v-if="hasMessages"
        v-tooltip.left="hint('Clear conversation')"
        class="fas fa-trash text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-xs"
        @click="showClearDialog = true" />
      <i
        v-tooltip.left="hint('Close')"
        class="fas fa-times text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-xs"
        @click="closeDrawer" />
    </div>
    <Confirmation
      v-model:visible="showClearDialog"
      title="Clear Conversation"
      message="This will delete every message in this chat. This cannot be undone."
      @confirm="clearConversation" />
  </div>
</template>
