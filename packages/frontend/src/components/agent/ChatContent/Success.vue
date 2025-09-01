<script setup lang="ts">
import { ref } from "vue";

import { ChatMessage } from "../ChatMessage";
import { useAutoScroll } from "../useAutoScroll";

import { useContent } from "./useContent";

import { useUIStore } from "@/stores/ui";

const { messages, agentStatus } = useContent();
const scrollContainer = ref<HTMLElement | undefined>();
const uiStore = useUIStore();

useAutoScroll(scrollContainer, [
  messages,
  agentStatus,
  () => uiStore.drawerVisible,
]);
</script>

<template>
  <div class="flex flex-col h-full relative overflow-auto">
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2"
    >
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>
  </div>
</template>
