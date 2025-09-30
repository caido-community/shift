<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Popover from "primevue/popover";
import { ref } from "vue";

import { useSelector } from "./useSelector";

const { promptOptions, isSelected, togglePrompt } = useSelector();

const popoverRef = ref<InstanceType<typeof Popover>>();
const onToggle = (event: MouseEvent) => popoverRef.value?.toggle(event);
</script>

<template>
  <div class="relative flex items-center">
    <Button
      severity="tertiary"
      icon="fas fa-plus"
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
              @click.stop
              @update:model-value="togglePrompt(prompt.id)"
            />
            <span class="text-surface-200 text-sm font-mono truncate">{{
              prompt.title
            }}</span>
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
