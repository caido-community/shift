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
const messages = computed(() => session.chat.messages);
const isSubmitted = computed(() => session.isWaitingForFirstToken());
const isErrored = computed(() => session.isErrored());
const debugMode = computed(() => store.debugMode);
const generatingText = useAnimatedDots("Generating", isSubmitted);

const container = ref<HTMLElement>();
const { arrivedState } = useScroll(container);
const hasAutoScrolledOnOpen = ref(false);

const scrollToBottom = async (): Promise<void> => {
  await nextTick();
  container.value?.scrollTo({ top: container.value.scrollHeight });
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
  <div
    ref="container"
    class="h-full overflow-y-auto flex flex-col gap-2 custom-scrollbar pb-4">
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
      v-else-if="isErrored"
      class="text-surface-500 font-mono text-sm px-2.5">
      Something went wrong
    </div>
  </div>
</template>
