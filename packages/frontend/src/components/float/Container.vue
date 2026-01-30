<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

import { Actions } from "@/components/float/actions";
import { useFloat } from "@/components/float/useDrag";
import { useFloatStore } from "@/stores/float";

const { initialTop, initialLeft } = defineProps<{
  initialTop: number;
  initialLeft: number;
}>();

const containerRef = ref<HTMLElement | undefined>(undefined);

const { style, isResizing, onDragMouseDown, onResizeMouseDown } = useFloat(containerRef, {
  initialTop,
  initialLeft,
});

const store = useFloatStore();
const { isRunning, query } = storeToRefs(store);

const textarea = ref<HTMLTextAreaElement>();

onMounted(() => {
  store.textarea = textarea.value;
  textarea.value?.focus();
});

onKeyStroke("Escape", () => {
  store.closeFloat();
});
</script>

<template>
  <div
    ref="containerRef"
    class="fixed bg-surface-800 border border-surface-700 rounded-md p-3 flex flex-col gap-2 shadow-md"
    :style="style"
    @mousedown="onDragMouseDown">
    <div class="flex h-full">
      <div class="w-9/10 flex-1">
        <textarea
          ref="textarea"
          v-model="query"
          class="w-full h-full text-surface-50 flex-1 resize-none border-none outline-none text-sm rounded-sm bg-surface-800 font-mono scrollbar-hide"
          placeholder="Search for JS files"
          :disabled="isRunning"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          @mousedown.stop
          @keydown="store.handleKeydown"></textarea>
      </div>
      <div class="w-1/10 flex items-start justify-end p-1">
        <button
          class="text-surface-400 hover:text-surface-200 text-sm leading-none"
          @click="store.closeFloat"
          @mousedown.stop>
          ✕
        </button>
      </div>
    </div>
    <Actions />
    <div
      class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize hover:bg-secondary-500/50 transition-colors rounded-br-md"
      :class="{ 'bg-secondary-500/50': isResizing }"
      @mousedown="onResizeMouseDown" />
  </div>
</template>
