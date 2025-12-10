<script setup lang="ts">
import Button from "primevue/button";
import { computed, onBeforeUnmount, onMounted } from "vue";

import PromptPopover from "./PromptPopover.vue";
import { useSelector } from "./useSelector";

const { agentId = undefined, isSettings = false } = defineProps<{
  agentId?: string;
  isSettings?: boolean;
}>();

const {
  selectedPromptIds,
  promptOptions,
  listRef,
  showLeft,
  showRight,
  scrollLeftBy,
  scrollRightBy,
  bindScrollHandlers,
  unbindScrollHandlers,
} = useSelector(agentId);

onMounted(() => bindScrollHandlers());
onBeforeUnmount(() => unbindScrollHandlers());

const selectedPrompts = computed(() =>
  selectedPromptIds.value
    .map((id) => promptOptions.value.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined),
);
</script>

<template>
  <div class="relative flex items-center gap-2 min-w-0 shrink">
    <div class="relative w-64 overflow-hidden">
      <div
        ref="listRef"
        class="flex items-center gap-2 overflow-x-auto flex-nowrap w-full scrollbar-hidden relative z-10 min-h-6"
      >
        <div class="flex-1 min-w-0 shrink" aria-hidden="true" />
        <div
          v-for="prompt in selectedPrompts"
          :key="prompt.id"
          class="relative shrink-0"
        >
          <div
            class="px-2 py-1 rounded border border-dotted border-surface-600 text-surface-300 text-xs font-mono cursor-default hover:border-surface-500 whitespace-nowrap"
          >
            {{ prompt.title }}
          </div>
        </div>
      </div>

      <Button
        v-if="showLeft"
        severity="tertiary"
        icon="fas fa-angle-left"
        :pt="{
          root: {
            class:
              'absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface-700/80 text-surface-300 hover:text-white hover:bg-surface-700/90 shadow z-30',
          },
        }"
        @click="scrollLeftBy"
      />
      <Button
        v-if="showRight"
        severity="tertiary"
        icon="fas fa-angle-right"
        :pt="{
          root: {
            class:
              'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface-700/80 text-surface-300 hover:text-white hover:bg-surface-700/90 shadow z-30',
          },
        }"
        @click="scrollRightBy"
      />
    </div>
    <PromptPopover :agent-id="agentId" :is-settings="isSettings" />
  </div>
</template>
