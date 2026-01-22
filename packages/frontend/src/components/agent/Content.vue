<script setup lang="ts">
import { computed } from "vue";

import { ChatContent } from "./ChatContent";
import { ChatError } from "./ChatError";
import { ChatInput } from "./ChatInput";
import { ChatQueue } from "./ChatQueue";
import { ChatTodos } from "./ChatTodos";
import { ChatTopbar } from "./ChatTopbar";

import { type AgentSession } from "@/agent/session";

const { session } = defineProps<{
  session: AgentSession;
}>();

const error = computed(() => session?.chat.error);
</script>

<template>
  <div class="flex flex-col h-full">
    <ChatTopbar class="flex-shrink-0 px-1.5" />
    <ChatContent class="flex-1 min-h-0 pl-2" />
    <div class="flex-shrink-0">
      <ChatError
        v-if="error"
        :error="error" />
      <ChatTodos />
      <ChatQueue />
      <ChatInput />
    </div>
  </div>
</template>
