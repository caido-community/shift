<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Popover from "primevue/popover";
import { ref } from "vue";

import { useSelector } from "./useSelector";
import { useUIStore } from "@/stores/ui";
import { useChat } from "../useChat";

const { promptOptions, isSelected, togglePrompt } = useSelector();
const uiStore = useUIStore();
const { isAgentIdle } = useChat();

const popoverRef = ref<InstanceType<typeof Popover>>();
const onToggle = (event: MouseEvent) => popoverRef.value?.toggle(event);

const handleEditPrompt = (prompt: any, event: Event) => {
  event.stopPropagation();
  uiStore.openEditPromptDialog(prompt);
};
</script>

<template>
  <div class="relative flex items-center">
    <Button
      severity="tertiary"
      icon="fas fa-plus"
      :disabled="!isAgentIdle"
      :pt="{
        root: {
          class:
            'bg-surface-700/50 text-surface-200 text-sm py-1.5 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 h-8 w-8 cursor-pointer',
        },
      }"
      @click="onToggle"
    />

    <Popover
      ref="popoverRef"
      position="top"
      :pt="{
        root: {
          class:
            'bg-surface-800 border border-surface-700 rounded-md shadow-lg',
        },
        content: {
          class: 'p-1 rounded-md',
        },
      }"
    >
      <div class="flex flex-col gap-1.5 w-fit">
        <div class="max-h-64 overflow-y-auto">
          <div
            v-for="prompt in promptOptions"
            :key="prompt.id"
            class="flex items-center gap-2 py-1 px-1.5 hover:bg-surface-700/40 rounded"
            @click="togglePrompt(prompt.id)"
          >
            <Checkbox
              :model-value="isSelected(prompt.id)"
              binary
              size="small"
              @update:model-value="togglePrompt(prompt.id)"
            />
            <span class="text-surface-200 text-sm font-mono truncate flex-1">{{
              prompt.title
            }}</span>
            <Button
              v-if="!prompt.isDefault"
              icon="fas fa-edit"
              size="small"
              severity="secondary"
              outlined
              :pt="{
                root: {
                  class: 'h-6 w-6 p-0 text-surface-400 hover:text-surface-200',
                },
              }"
              @click="handleEditPrompt(prompt, $event)"
            />
          </div>
          <div
            v-if="promptOptions.length === 0"
            class="text-surface-400 text-xs p-2"
          >
            No prompts
          </div>
        </div>
      </div>
    </Popover>
  </div>
</template>
