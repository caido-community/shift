<script setup lang="ts">
import type { ReasoningUIPart } from "ai";
import type { MessageState } from "shared";
import { nextTick, ref, watch } from "vue";

import { Markdown } from "../Markdown";

import { useReasoning } from "./useReasoning";

import { TextShimmer } from "@/components/common/TextShimmer";

const { text, partState, messageState, reasoningTime } = defineProps<{
  text: string;
  partState: ReasoningUIPart["state"];
  messageState: MessageState | undefined;
  reasoningTime: string | undefined;
}>();

const {
  showReasoning,
  toggleReasoning,
  isStreaming,
  hasContent,
  reasoningLabel,
  reasoningDuration,
} = useReasoning({
  text: () => text,
  partState: () => partState,
  messageState: () => messageState,
  reasoningTime: () => reasoningTime,
});

const streamingContainer = ref<HTMLDivElement>();

watch(
  () => text,
  async () => {
    if (!isStreaming.value || !hasContent.value) return;
    await nextTick();
    const container = streamingContainer.value;
    if (container === undefined) return;
    container.scrollTop = container.scrollHeight;
  }
);
</script>

<template>
  <div class="text-sm">
    <component
      :is="!isStreaming && hasContent ? 'button' : 'div'"
      :class="[
        'flex items-center gap-1.5 h-5 text-surface-300',
        !isStreaming && hasContent && 'group hover:text-surface-200 transition-colors',
      ]"
      @click="!isStreaming && hasContent ? toggleReasoning() : undefined">
      <component
        :is="isStreaming ? TextShimmer : 'span'"
        class="select-none">
        {{ reasoningLabel
        }}<span
          v-if="!isStreaming && reasoningDuration"
          class="text-surface-500">
          for {{ reasoningDuration }}
        </span>
      </component>
      <i
        v-if="!isStreaming && hasContent"
        class="fas fa-chevron-right text-[10px] text-surface-500 transition-all duration-150 ease-in-out ml-1.5"
        :class="[showReasoning ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100']" />
    </component>

    <div
      v-if="isStreaming && hasContent && text"
      ref="streamingContainer"
      class="max-h-48 overflow-y-auto fade-top hide-scrollbar smooth-scroll">
      <div class="text-surface-400">
        <Markdown :text="text" />
      </div>
    </div>

    <div
      v-if="!isStreaming && showReasoning && hasContent && text"
      class="max-h-48 overflow-y-auto hide-scrollbar py-0.5">
      <div class="text-surface-400">
        <Markdown :text="text" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.smooth-scroll {
  scroll-behavior: smooth;
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
