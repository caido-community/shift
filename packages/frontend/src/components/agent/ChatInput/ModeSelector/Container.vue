<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import type { AgentMode } from "shared";
import { computed, ref } from "vue";

import { useSession } from "../../useSession";

const session = useSession();
const mode = computed(() => session.store.mode);

type ModeConfig = {
  label: string;
  description: string;
};

const modeConfig: Record<AgentMode, ModeConfig> = {
  focus: {
    label: "Focus",
    description: "Stays focused on the current endpoint.",
  },
  wildcard: {
    label: "Wildcard",
    description: "Explores freely. Can test other endpoints and browse HTTP history.",
  },
};

const modes: AgentMode[] = ["focus", "wildcard"];

const isOpen = ref(false);
const hoveredMode = ref<AgentMode | undefined>(undefined);
const containerRef = ref<HTMLElement>();

onClickOutside(containerRef, () => {
  isOpen.value = false;
  hoveredMode.value = undefined;
});

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    hoveredMode.value = undefined;
  }
};

const selectMode = (m: AgentMode) => {
  session.store.setMode(m);
  isOpen.value = false;
  hoveredMode.value = undefined;
};
</script>

<template>
  <div
    ref="containerRef"
    class="relative">
    <button
      type="button"
      :class="[
        'flex items-center gap-1.5 px-1 py-1 text-sm rounded transition-colors text-surface-400 hover:text-surface-200 cursor-pointer',
        isOpen ? 'text-surface-200' : '',
      ]"
      @click="toggle">
      <span>{{ modeConfig[mode].label }}</span>
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
              v-for="m in modes"
              :key="m"
              type="button"
              :class="[
                'px-3 py-1.5 text-left text-sm transition-colors whitespace-nowrap',
                m === mode
                  ? 'bg-surface-700/50 text-surface-100'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @mouseenter="hoveredMode = m"
              @mouseleave="hoveredMode = undefined"
              @click="selectMode(m)">
              <div class="flex items-center justify-between gap-4">
                <span>{{ modeConfig[m].label }}</span>
                <i
                  v-if="m === mode"
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
              v-if="hoveredMode !== undefined"
              class="absolute right-full bottom-0 mr-1 w-72 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 text-[13px] text-surface-300 shadow-xl leading-relaxed">
              {{ modeConfig[hoveredMode].description }}
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>
