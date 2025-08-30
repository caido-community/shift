<script setup lang="ts">
import { toRefs } from "vue";

import { useUserMessage } from "./useMessage";

import { type CustomUIMessage } from "@/agents/types";

const props = defineProps<{
  message: CustomUIMessage & { role: "user" };
}>();
const { message } = toRefs(props);

const { isGenerating, handleMessageClick } = useUserMessage();
</script>

<template>
  <div
    class="p-3 rounded-lg bg-surface-900 ml-auto shadow-lg shadow-surface-800 w-full select-text group relative border border-surface-700 hover:border-secondary-400 transition-colors"
  >
    <div
      v-for="(part, index) in message.parts"
      :key="index"
      class="text-surface-200 whitespace-pre-wrap break-words font-mono text-sm cursor-pointer rounded p-1 -m-1"
      :class="{ 'opacity-80': isGenerating }"
      @click="handleMessageClick(message)"
    >
      <span v-if="part && part.type === 'text'">{{ part.text ?? "" }}</span>
    </div>
  </div>
</template>
