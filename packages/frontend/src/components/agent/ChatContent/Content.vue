<script setup lang="ts">
import { useScroll } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { useSession } from "../useSession";

import { ChatMessage } from "./ChatMessage";

import { TextShimmer } from "@/components/common/TextShimmer";
import { useAgentStore } from "@/stores/agent/store";
import { useAnimatedDots } from "@/utils";

const session = useSession();
const store = useAgentStore();
const { phase } = session;
const messages = computed(() => session.chat.messages);
const isSubmitted = computed(() => phase.value === "waiting" || phase.value === "compacting");
const errorMessage = computed(
  () => session.chat.error?.message ?? "The agent stopped because of an unexpected error."
);
const debugMode = computed(() => store.debugMode);
const generatingText = useAnimatedDots(
  () => (phase.value === "compacting" ? "Compacting" : "Generating"),
  isSubmitted
);
const isPaused = computed(
  () => phase.value === "idle" && messages.value.at(-1)?.metadata?.stepLimitReached === true
);

const continueRun = () => {
  session.send("Continue");
};

const container = ref<HTMLElement>();
const { arrivedState, measure } = useScroll(container);
const hasAutoScrolledOnOpen = ref(false);

const scrollToBottom = async (): Promise<void> => {
  await nextTick();
  container.value?.scrollTo({ top: container.value.scrollHeight });
  measure();
};

onMounted(async () => {
  await scrollToBottom();
  hasAutoScrolledOnOpen.value = true;
});

watch(
  messages,
  async (curr, prev) => {
    const shouldAutoScrollOnOpen = !hasAutoScrolledOnOpen.value;
    const isNewMessage = curr.length !== prev?.length;
    if (!shouldAutoScrollOnOpen && !isNewMessage && !arrivedState.bottom) return;
    await scrollToBottom();
    hasAutoScrolledOnOpen.value = true;
  },
  { deep: true, flush: "post" }
);
</script>

<template>
  <div class="relative flex flex-col">
    <div
      ref="container"
      class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 custom-scrollbar pb-4">
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :debug-mode="debugMode" />
      <div
        v-if="isSubmitted"
        class="text-surface-300 font-mono text-sm px-2.5">
        <TextShimmer class="select-none">{{ generatingText }}</TextShimmer>
      </div>
      <div
        v-else-if="phase === 'error'"
        class="text-surface-500 font-mono text-sm px-2.5">
        {{ errorMessage }}
      </div>
      <div
        v-else-if="isPaused"
        class="flex items-center gap-2 text-surface-400 font-mono text-sm px-2.5">
        <i class="fas fa-pause text-xs" />
        <span>Paused at the iteration limit</span>
        <button
          type="button"
          class="text-surface-200 hover:text-white underline underline-offset-2 transition-colors"
          @click="continueRun">
          Continue
        </button>
      </div>
    </div>
    <button
      v-if="!arrivedState.bottom"
      type="button"
      class="absolute bottom-3 right-4 h-7 w-7 rounded-full bg-surface-700 border border-surface-600 text-surface-300 hover:text-white shadow-md transition-colors"
      title="Jump to latest"
      @click="scrollToBottom">
      <i class="fas fa-arrow-down text-xs" />
    </button>
  </div>
</template>
