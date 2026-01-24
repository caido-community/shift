<script setup lang="ts">
import { computed, ref } from "vue";

import Content from "./Content.vue";

import { useAgentStore } from "@/stores/agent/store";
import { useUIStore } from "@/stores/ui";

const store = useAgentStore();
const uiStore = useUIStore();

const isResizing = ref(false);

const drawerStyle = computed(() => ({
  width: `${uiStore.drawerWidth}px`,
}));

const startResize = (e: MouseEvent) => {
  e.preventDefault();
  isResizing.value = true;

  const startX = e.clientX;
  const startWidth = uiStore.drawerWidth;

  const onMouseMove = (moveEvent: MouseEvent) => {
    const delta = startX - moveEvent.clientX;
    uiStore.setDrawerWidth(startWidth + delta);
  };

  const onMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.body.style.cursor = "ew-resize";
  document.body.style.userSelect = "none";
};
</script>

<template>
  <div
    v-if="uiStore.drawerVisible"
    class="fixed inset-0 z-50 pointer-events-none"
    style="margin-top: 3.5rem; height: calc(100vh - 3.5rem)">
    <div
      class="absolute top-0 right-0 bg-surface-800 shadow-lg pointer-events-auto h-full border-l border-t border-surface-700"
      :style="drawerStyle">
      <div
        class="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-secondary-500/50 transition-colors z-10"
        :class="{ 'bg-secondary-500/50': isResizing }"
        @mousedown="startResize" />
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
