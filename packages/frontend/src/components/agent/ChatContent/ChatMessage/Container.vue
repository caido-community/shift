<script setup lang="ts">
import type { ShiftMessage } from "shared";
import { computed, toRef } from "vue";

import { ChatMessageAssistant } from "./Assistant";
import { ChatMessageUser } from "./User";

import { isPresent } from "@/utils/optional";

const { message, debugMode } = defineProps<{
  message: ShiftMessage;
  debugMode: boolean;
}>();

const messageRef = toRef(() => message);
const userMessage = computed(() => messageRef.value as ShiftMessage & { role: "user" });
const assistantMessage = computed(() => messageRef.value as ShiftMessage & { role: "assistant" });

const hasVisibleContent = computed(() => {
  if (debugMode) {
    return true;
  }

  if (message.role === "assistant") {
    return message.parts.some((part) => isPresent(part) && part.type !== "step-start");
  }

  if (message.role === "user") {
    return message.parts.some(
      (part) => isPresent(part) && part.type === "text" && part.text.trim() !== ""
    );
  }

  return true;
});
</script>

<template>
  <div
    v-if="hasVisibleContent"
    class="whitespace-pre-wrap break-words select-text text-sm">
    <template v-if="!debugMode">
      <ChatMessageUser
        v-if="message.role === 'user'"
        :message="userMessage" />
      <ChatMessageAssistant
        v-else-if="message.role === 'assistant'"
        :message="assistantMessage" />
      <div v-else>Unknown role: {{ message.role }}</div>
    </template>
    <pre
      v-else
      class="text-xs text-surface-300 bg-surface-900 p-2 rounded border border-surface-700 overflow-x-auto"
      >{{ message }}</pre
    >
  </div>
</template>
