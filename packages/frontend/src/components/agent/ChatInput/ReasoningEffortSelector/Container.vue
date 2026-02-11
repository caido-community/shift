<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, ref } from "vue";

import { useSession } from "../../useSession";

import type { ReasoningEffort } from "@/utils/ai";

const { disabled = false } = defineProps<{
  disabled?: boolean;
}>();

const session = useSession();
const reasoningEffort = computed(() => session.store.reasoningEffort);

type EffortConfig = {
  label: string;
  description: string;
};

const effortConfig: Record<ReasoningEffort, EffortConfig> = {
  low: {
    label: "Low",
    description: "Faster responses with lighter reasoning.",
  },
  medium: {
    label: "Medium",
    description: "Balanced speed and reasoning depth.",
  },
  high: {
    label: "High",
    description: "Deeper reasoning with potentially slower responses.",
  },
};

const efforts: ReasoningEffort[] = ["low", "medium", "high"];

const isOpen = ref(false);
const hoveredEffort = ref<ReasoningEffort | undefined>(undefined);
const hoveredPopoverTop = ref<number | undefined>(undefined);
const containerRef = ref<HTMLElement>();

onClickOutside(containerRef, () => {
  isOpen.value = false;
  hoveredEffort.value = undefined;
  hoveredPopoverTop.value = undefined;
});

const toggle = () => {
  if (disabled) return;
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    hoveredEffort.value = undefined;
    hoveredPopoverTop.value = undefined;
  }
};

const selectEffort = (value: ReasoningEffort) => {
  session.store.setReasoningEffort(value);
  isOpen.value = false;
  hoveredEffort.value = undefined;
  hoveredPopoverTop.value = undefined;
};

const handleEffortEnter = (effort: ReasoningEffort, event: MouseEvent) => {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;

  hoveredEffort.value = effort;
  hoveredPopoverTop.value = target.offsetTop + target.offsetHeight / 2;
};

const handleEffortLeave = () => {
  hoveredEffort.value = undefined;
  hoveredPopoverTop.value = undefined;
};
</script>

<template>
  <div
    ref="containerRef"
    class="relative">
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'flex items-center gap-1.5 px-1 py-1 text-sm rounded transition-colors text-surface-400 hover:text-surface-200 cursor-pointer',
        disabled ? 'opacity-50 cursor-not-allowed hover:text-surface-400' : '',
        isOpen ? 'text-surface-200' : '',
      ]"
      @click="toggle">
      <span>{{ effortConfig[reasoningEffort].label }}</span>
      <i
        :class="[
          'fas fa-chevron-down transition-transform text-[8px] text-surface-600',
          isOpen ? 'rotate-180' : '',
        ]" />
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div
        v-if="isOpen"
        class="absolute bottom-full mb-1 left-0 z-[10001]">
        <div class="relative">
          <div
            class="flex flex-col rounded-lg border border-surface-700 bg-surface-900 shadow-xl overflow-hidden">
            <button
              v-for="effort in efforts"
              :key="effort"
              type="button"
              :class="[
                'px-3 py-1.5 text-left text-sm transition-colors whitespace-nowrap',
                effort === reasoningEffort
                  ? 'bg-surface-700/50 text-surface-100'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @mouseenter="handleEffortEnter(effort, $event)"
              @mouseleave="handleEffortLeave"
              @click="selectEffort(effort)">
              <div class="flex items-center justify-between gap-4">
                <span>{{ effortConfig[effort].label }}</span>
                <i
                  v-if="effort === reasoningEffort"
                  class="fas fa-check text-xs text-surface-400" />
              </div>
            </button>
          </div>

          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 -translate-x-1"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-1">
            <div
              v-if="hoveredEffort !== undefined && hoveredPopoverTop !== undefined"
              :style="{ top: `${hoveredPopoverTop}px` }"
              class="absolute right-full top-0 mr-1 w-72 -translate-y-1/2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 text-[13px] text-surface-300 shadow-xl leading-relaxed">
              {{ effortConfig[hoveredEffort].description }}
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>
