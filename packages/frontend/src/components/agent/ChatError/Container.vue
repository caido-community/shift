<script setup lang="ts">
import Button from "primevue/button";

import { useError } from "./useError";

const { error } = defineProps<{
  error: Error;
}>();

const { message, retry, copyTrace } = useError(error);
</script>

<template>
  <div class="bg-surface-900/70 border-t border-surface-700 animate-fade-in">
    <div class="flex items-center justify-between p-3 bg-surface-900 border-b border-surface-700">
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-triangle text-red-400 text-sm" />
        <span class="text-red-300 font-mono text-sm font-medium">Error</span>
      </div>
      <div class="flex items-center">
        <Button
          label="Copy Trace"
          text
          icon="fas fa-copy"
          size="small"
          severity="info"
          class="text-xs"
          @click="copyTrace" />
        <Button
          label="Retry"
          icon="fas fa-redo"
          text
          size="small"
          severity="secondary"
          class="text-xs"
          @click="retry" />
      </div>
    </div>

    <div class="p-4 max-h-40 overflow-y-auto">
      <pre
        class="text-surface-400 text-sm font-mono leading-5 whitespace-pre-wrap break-words m-0 select-text"
        >{{ message }}</pre
      >
    </div>
  </div>
</template>
