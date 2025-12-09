<script setup lang="ts">
import { storeToRefs } from "pinia";

import Actions from "@/components/float/Actions.vue";
import { useDragResize } from "@/components/float/useDragResize";
import { useFloatStore } from "@/stores/float";

const props = defineProps<{
  initialTop: number;
  initialLeft: number;
}>();

const { style, onDragMouseDown } = useDragResize({
  initialTop: props.initialTop,
  initialLeft: props.initialLeft,
});

const store = useFloatStore();
const { isRunning, textarea, query } = storeToRefs(store);
</script>

<template>
  <div
    class="fixed bg-surface-800 border border-surface-700 rounded-md p-3 flex flex-col gap-2 shadow-md"
    :style="style"
    @mousedown="onDragMouseDown"
  >
    <div class="flex h-full">
      <div class="w-9/10 flex-1">
        <textarea
          ref="textarea"
          v-model="query"
          class="w-full h-full text-surface-50 flex-1 resize-none border-none outline-none text-sm rounded-sm bg-surface-800 font-mono scrollbar-hide"
          placeholder="Enter your query here..."
          :disabled="isRunning"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          @mousedown.stop
          @keydown="store.handleKeydown"
        ></textarea>
      </div>
      <div class="w-1/10 flex items-start justify-end p-1">
        <button
          class="text-surface-400 hover:text-surface-200 text-sm leading-none"
          @click="store.closeFloat"
          @mousedown.stop
        >
          ✕
        </button>
      </div>
    </div>
    <Actions />
  </div>
</template>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
