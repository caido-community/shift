<script setup lang="ts">
import { computed, toRefs } from "vue";

import { ChatMessageAssistant } from "./Assistant";
import { ChatMessageUser } from "./User";

import type { CustomUIMessage } from "@/agents/types";

const props = defineProps<{ message: CustomUIMessage }>();

const { message } = toRefs(props);

const userMessage = computed(
  () => message.value as CustomUIMessage & { role: "user" },
);

const assistantMessage = computed(
  () => message.value as CustomUIMessage & { role: "assistant" },
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
