<script setup lang="ts">
import Content from "./Content.vue";

import { useAgentStore } from "@/stores/agent/store";
import { useUIStore } from "@/stores/ui";

const store = useAgentStore();
const uiStore = useUIStore();
</script>

<template>
  <div
    v-if="uiStore.drawerVisible"
    class="fixed inset-0 z-50 pointer-events-none"
    style="margin-top: 3.5rem; height: calc(100vh - 3.5rem)">
    <div
      class="absolute top-0 right-0 bg-surface-800 shadow-lg pointer-events-auto h-full w-[35rem] border-l border-t border-surface-700">
      <Content
        v-if="store.activeSession"
        :key="store.activeSession?.id"
        :session="store.activeSession" />
      <div
        v-else-if="!store.isReady"
        class="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <i class="fas fa-circle-notch fa-spin text-2xl" />
        <span class="text-sm">Loading...</span>
      </div>
      <div
        v-else
        class="flex items-center justify-center h-full text-surface-400">
        <div class="text-center">
          <i class="fas fa-folder-open text-4xl mb-2" />
          <div class="text-lg">Session not found</div>
        </div>
      </div>
    </div>
  </div>
</template>
