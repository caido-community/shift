<script setup lang="ts">
import Button from "primevue/button";
import { onMounted, ref, watch } from "vue";

import { ModelSelector } from "./ModelSelector";
import { PromptSelector } from "./PromptSelector";
import { useChat } from "./useChat";

const {
  abortMessage,
  inputMessage,
  isEditingMessage,
  isAgentIdle,
  canSendMessage,
  handleSend,
  handleKeydown,
} = useChat();

const textareaRef = ref<HTMLTextAreaElement>();

onMounted(() => {
  textareaRef.value?.focus();
});

watch(
  isEditingMessage,
  (isEditing) => {
    if (isEditing && textareaRef.value) {
      textareaRef.value.focus();
    }
  },
  { flush: "post" },
);
</script>

<template>
  <div
    class="bg-surface-900 h-52 flex flex-col gap-4 border-t border-surface-700 p-4"
  >
    <textarea
      ref="textareaRef"
      v-model="inputMessage"
      placeholder="Message the Shift agent"
      :class="{
        'opacity-60': !isAgentIdle,
        'text-surface-200': isAgentIdle,
        'text-surface-400': !isAgentIdle,
      }"
      class="h-30 border-0 outline-none font-mono resize-none bg-transparent flex-1 text-base focus:outline-none focus:ring-0 overflow-y-auto scrollbar-hide"
      style="scrollbar-width: none; -ms-overflow-style: none"
      spellcheck="false"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      @keydown="handleKeydown"
    />

    <div class="flex justify-between gap-2 items-center">
      <div class="flex gap-2">
        <ModelSelector variant="chat" />
      </div>

      <div class="flex items-center gap-2">
        <PromptSelector v-if="isAgentIdle" />
        <Button
          v-if="isAgentIdle"
          severity="tertiary"
          icon="fas fa-arrow-circle-up"
          :disabled="!canSendMessage"
          :pt="{
            root: {
              class: canSendMessage
                ? 'bg-surface-700/50 text-surface-200 text-sm py-1.5 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 h-8 w-8 cursor-pointer'
                : 'bg-surface-700/20 text-surface-400 text-sm py-1.5 px-2 flex items-center justify-center rounded-md h-8 w-8 cursor-not-allowed',
            },
          }"
          @click="handleSend"
        />
        <Button
          v-else
          severity="danger"
          icon="fas fa-square"
          :pt="{
            root: {
              class:
                'bg-red-400/10 text-red-400 py-1 px-1.5 flex items-center justify-center rounded-md hover:bg-red-400/20 transition-colors duration-200 h-8 w-8 cursor-pointer',
            },
            icon: {
              class: 'text-sm',
            },
          }"
          @click="abortMessage"
        />
      </div>
    </div>
  </div>
</template>
