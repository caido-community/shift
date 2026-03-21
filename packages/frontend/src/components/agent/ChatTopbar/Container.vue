<script setup lang="ts">
import { useTopbar } from "./useTopbar";

const {
  clearConversation,
  contextUsageClass,
  contextUsageLabel,
  debugMode,
  debugToolsEnabled,
  toggleDebugMode,
  closeDrawer,
  copyAgentState,
} = useTopbar();
</script>

<template>
  <div class="flex items-center justify-between gap-2 h-8">
    <span
      class="text-xs select-none transition-colors"
      :class="contextUsageClass">
      {{ contextUsageLabel }}
    </span>

    <div class="flex items-center gap-2">
      <i
        v-if="debugToolsEnabled"
        :class="[
          'fas fa-bug cursor-pointer p-1 text-xs transition-colors',
          debugMode
            ? 'text-yellow-400 hover:text-yellow-300'
            : 'text-surface-400 hover:text-surface-200',
        ]"
        @click="toggleDebugMode" />
      <i
        v-if="debugToolsEnabled"
        class="fas fa-copy text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-xs"
        @click="copyAgentState" />
      <i
        class="fas fa-trash text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-xs"
        @click="clearConversation" />
      <i
        class="fas fa-times text-surface-400 hover:text-surface-200 cursor-pointer p-1 text-xs"
        @click="closeDrawer" />
    </div>
  </div>
</template>
