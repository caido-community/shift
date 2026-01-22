<script setup lang="ts">
import { useQueue } from "./useQueue";

const { hasQueue, queuedMessages, sendNow, remove } = useQueue();
</script>

<template>
  <div
    v-if="hasQueue"
    class="p-4 bg-surface-900 border-t border-surface-700 animate-fade-in">
    <div class="flex items-center gap-2 mb-3">
      <i class="fas fa-layer-group text-surface-400 text-sm" />
      <span class="text-surface-300 font-mono text-sm font-medium">Messages Queue</span>
    </div>

    <div class="space-y-2 max-h-40 overflow-y-auto">
      <div
        v-for="msg in queuedMessages"
        :key="msg.id"
        class="flex items-center gap-2 animate-fade-in group">
        <span class="text-surface-300 text-sm font-mono leading-5 truncate flex-1">
          {{ msg.text }}
        </span>
        <button
          type="button"
          class="text-xs text-surface-400 hover:text-surface-300 font-mono shrink-0 transition-colors"
          @click="sendNow(msg.id)">
          send now
        </button>
        <button
          type="button"
          class="text-xs text-surface-500 hover:text-surface-300 font-mono shrink-0 transition-colors"
          @click="remove(msg.id)">
          <i class="fas fa-times" />
        </button>
      </div>
    </div>
  </div>
</template>
