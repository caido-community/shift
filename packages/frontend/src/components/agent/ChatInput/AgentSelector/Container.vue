<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, ref } from "vue";

import { useSession } from "../../useSession";

import { useCustomAgentsStore } from "@/stores/custom-agents/store";

const customAgentsStore = useCustomAgentsStore();
const session = useSession();

const isOpen = ref(false);
const containerRef = ref<HTMLElement>();
const hoveredAgentId = ref<string | undefined>(undefined);

const selectedAgentId = computed(() => session.store.selectedCustomAgentId);

const selectedAgent = computed(() => {
  if (selectedAgentId.value === undefined) return undefined;
  return customAgentsStore.getAgentById(selectedAgentId.value);
});

const agents = computed(() => customAgentsStore.agents);
const hasAgents = computed(() => agents.value.length > 0);
const hoveredAgent = computed(() =>
  hoveredAgentId.value === undefined
    ? undefined
    : agents.value.find((agent) => agent.id === hoveredAgentId.value)
);

onClickOutside(containerRef, () => {
  isOpen.value = false;
  hoveredAgentId.value = undefined;
});

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    hoveredAgentId.value = undefined;
  }
};

const selectAgent = (agentId: string) => {
  const agent = customAgentsStore.getAgentById(agentId);
  if (agent !== undefined) {
    session.store.setCustomAgent(agent);
  }
  isOpen.value = false;
};

const clearAgent = () => {
  session.store.clearCustomAgent();
  isOpen.value = false;
};
</script>

<template>
  <div
    v-if="hasAgents"
    ref="containerRef"
    class="relative">
    <button
      type="button"
      :class="[
        'flex items-center gap-1.5 px-1 py-1 text-sm rounded transition-colors cursor-pointer',
        selectedAgent !== undefined
          ? 'text-surface-400 hover:text-surface-200'
          : 'text-surface-500 hover:text-surface-300',
        isOpen ? (selectedAgent !== undefined ? 'text-surface-200' : 'text-surface-300') : '',
      ]"
      @click="toggle">
      <span class="truncate max-w-[120px]">
        {{ selectedAgent !== undefined ? selectedAgent.name : "No Agent" }}
      </span>
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
        class="absolute bottom-full mb-1 left-0 z-[10001] w-56 rounded-lg border border-surface-700 bg-surface-900 shadow-xl">
        <div class="relative">
          <div class="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              :class="[
                'w-full px-3 py-1.5 text-left text-sm transition-colors',
                selectedAgentId === undefined
                  ? 'bg-surface-700/50 text-surface-100'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @mouseenter="hoveredAgentId = undefined"
              @click="clearAgent">
              No Agent
            </button>
            <button
              v-for="agent in agents"
              :key="agent.id"
              type="button"
              :class="[
                'w-full px-3 py-1.5 text-left text-sm transition-colors',
                selectedAgentId === agent.id
                  ? 'bg-surface-700/50 text-surface-100'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @mouseenter="hoveredAgentId = agent.id"
              @mouseleave="hoveredAgentId = undefined"
              @click="selectAgent(agent.id)">
              <div class="flex items-center justify-between gap-2">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="truncate">{{ agent.name }}</span>
                </div>
                <i
                  v-if="selectedAgentId === agent.id"
                  class="fas fa-check text-xs text-surface-400 shrink-0" />
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
              v-if="hoveredAgent?.description"
              class="absolute right-full bottom-0 mr-1 w-max max-w-96 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 text-[13px] text-surface-300 shadow-xl leading-relaxed whitespace-normal">
              {{ hoveredAgent.description }}
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>
