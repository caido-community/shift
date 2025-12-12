<script setup lang="ts">
import { computed, toRef } from "vue";

import { ChatMessageAssistant } from "./Assistant";
import { ChatMessageUser } from "./User";

import type { CustomUIMessage } from "@/agents/types";

const { message } = defineProps<{ message: CustomUIMessage }>();

const messageRef = toRef(() => message);

const userMessage = computed(
  () => messageRef.value as CustomUIMessage & { role: "user" },
);

const assistantMessage = computed(
  () => messageRef.value as CustomUIMessage & { role: "assistant" },
);
</script>

<template>
  <ChatMessageUser v-if="message.role === 'user'" :message="userMessage" />
  <ChatMessageAssistant
    v-else-if="message.role === 'assistant'"
    :message="assistantMessage"
  />
  <div v-else>Unknown role: {{ message.role }}</div>
</template>
