<script setup lang="ts">
import { ref, toRef } from "vue";

import { Markdown } from "../Markdown";

import { useReasoning } from "./useReasoning";

import type { MessageState } from "@/agents/types";
import { useAutoScroll } from "@/components/agent/useAutoScroll";

const { content, state, messageState } = defineProps<{
  content: string;
  state: "streaming" | "done" | undefined;
  messageState: MessageState | undefined;
}>();

const contentRef = toRef(() => content);
const stateRef = toRef(() => state);
const messageStateRef = toRef(() => messageState);
const contentContainer = ref<HTMLElement>();

const {
  showReasoning,
  toggleReasoning,
  isReasoning,
  reasoningText,
  hasContent,
} = useReasoning({
  content: contentRef,
  state: stateRef,
  messageState: messageStateRef,
  contentContainer,
});

useAutoScroll(
  contentContainer,
  [() => (isReasoning.value ? content : undefined)],
  { smooth: true, always: true },
);
</script>

<template>
  <div class="py-1">
    <template v-if="isReasoning">
      <div class="flex items-center text-surface-300 text-sm font-mono">
        <span :class="{ shimmer: true }">{{ reasoningText }}</span>
      </div>
      <div
        v-if="hasContent"
        ref="contentContainer"
        class="max-h-64 overflow-hidden fade-top"
      >
        <div class="text-surface-300 [&_*]:text-surface-300 text-sm">
          <Markdown :content="content" />
        </div>
      </div>
    </template>

    <template v-else>
      <button
        v-if="hasContent"
        class="group w-full flex items-center text-surface-300 hover:text-surface-200 text-sm transition-colors font-mono"
        @click="toggleReasoning"
      >
        <span>{{ reasoningText }}</span>
        <i
          class="fas transition-transform text-sm opacity-0 group-hover:opacity-100 duration-200 ml-auto"
          :class="showReasoning ? 'fa-chevron-up' : 'fa-chevron-down'"
        ></i>
      </button>
      <div v-else class="flex items-center text-surface-300 text-sm font-mono">
        <span>{{ reasoningText }}</span>
      </div>

      <div
        v-if="showReasoning && hasContent"
        class="max-h-48 overflow-y-auto scrollbar-hover"
      >
        <div class="text-surface-300 [&_*]:text-surface-300 text-sm">
          <Markdown :content="content" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scrollbar-hover {
  scrollbar-color: transparent transparent;
}
.scrollbar-hover:hover {
  scrollbar-color: auto auto;
}
.scrollbar-hover::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  background: transparent;
}
.scrollbar-hover:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.scrollbar-hover:hover::-webkit-scrollbar-track {
  background: transparent;
}

.fade-top {
  -webkit-mask-image: linear-gradient(
    to top,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 90%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: linear-gradient(
    to top,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 90%,
    rgba(0, 0, 0, 0) 100%
  );
}
</style>
