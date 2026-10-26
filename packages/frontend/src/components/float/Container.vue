<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { nextTick, onMounted, onUnmounted, ref } from "vue";

import { Actions } from "@/components/float/actions";
import { useFloat } from "@/components/float/useDrag";
import { closeFloat } from "@/float/float";
import { useFloatStore } from "@/stores/float";

const { initialTop, initialLeft } = defineProps<{
  initialTop: number;
  initialLeft: number;
}>();

const { style, isResizing, onDragMouseDown, onResizeMouseDown } = useFloat({
  initialTop,
  initialLeft,
});

const store = useFloatStore();
const { isRunning, query } = storeToRefs(store);

const textarea = ref<HTMLTextAreaElement>();

onMounted(() => textarea.value?.focus());
onUnmounted(store.stopQuery);
onKeyStroke("Escape", closeFloat);

const isCaretOnEdge = (element: HTMLTextAreaElement, edge: "first" | "last"): boolean => {
  const caret = element.selectionStart ?? 0;
  const value = element.value;
  if (edge === "first") {
    return !value.slice(0, caret).includes("\n");
  }
  return caret >= value.lastIndexOf("\n") + 1;
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void store.runQuery();
    return;
  }

  const element = event.currentTarget as HTMLTextAreaElement;
  let direction: "prev" | "next" | undefined;
  if (event.key === "ArrowUp" && isCaretOnEdge(element, "first")) {
    direction = "prev";
  } else if (event.key === "ArrowDown" && isCaretOnEdge(element, "last")) {
    direction = "next";
  }
  if (direction === undefined || !store.navigateHistory(direction)) return;

  event.preventDefault();
  event.stopPropagation();
  void nextTick(() => {
    const position = direction === "prev" ? 0 : element.value.length;
    element.setSelectionRange(position, position);
  });
};
</script>

<template>
  <div
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
          @keydown="onKeydown"></textarea>
      </div>
      <div class="w-1/10 flex items-start justify-end p-1">
        <button
          class="text-surface-400 hover:text-surface-200 text-sm leading-none"
          @click="closeFloat"
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
