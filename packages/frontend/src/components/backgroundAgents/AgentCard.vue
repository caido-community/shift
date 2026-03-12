<script setup lang="ts">
import { useScroll } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { TextShimmer } from "@/components/common/TextShimmer";
import {
  type BackgroundAgent,
  type BackgroundAgentLog,
  useBackgroundAgentsStore,
} from "@/stores/backgroundAgents";

const { agent } = defineProps<{
  agent: BackgroundAgent;
}>();

const store = useBackgroundAgentsStore();
const logsContainer = ref<HTMLElement | undefined>(undefined);
const { arrivedState } = useScroll(logsContainer);

const statusIconClass = computed(() => {
  switch (agent.status) {
    case "queued":
      return "fas fa-clock text-surface-400";
    case "running":
      return "fas fa-circle-notch fa-spin text-secondary-400";
    case "done":
      return "fas fa-check-circle text-success-500";
    case "error":
      return "fas fa-times-circle text-error-500";
    case "aborted":
      return "fas fa-ban text-surface-500";
    default:
      return "fas fa-clock text-surface-400";
  }
});

const scrollToBottom = async (force: boolean) => {
  await nextTick();
  if (!force && !arrivedState.bottom) {
    return;
  }
  logsContainer.value?.scrollTo({
    top: logsContainer.value.scrollHeight,
    behavior: "smooth",
  });
};

onMounted(async () => {
  await scrollToBottom(true);
});

watch(
  () => agent.logs.length,
  async (current, previous) => {
    if (current === previous) {
      return;
    }
    await scrollToBottom(previous === 0);
  },
  { flush: "post" }
);

const logIconClass = (log: BackgroundAgentLog) => {
  if (log.level === "error") {
    return "fas fa-times-circle text-error-400";
  }
  if (log.level === "success") {
    return "fas fa-check-circle text-success-400";
  }
  if (log.text.startsWith("Calling ")) {
    return "fas fa-circle-notch fa-spin text-secondary-400";
  }
  return "fas fa-angle-right text-surface-500";
};

const logTextClass = (log: BackgroundAgentLog) => {
  switch (log.level) {
    case "success":
      return "text-surface-200";
    case "error":
      return "text-error-300";
    default:
      return "text-surface-300";
  }
};

const latestLogId = computed(() => {
  const latest = agent.logs[agent.logs.length - 1];
  return latest?.id;
});

const toggleExpanded = () => {
  store.toggleExpanded(agent.id);
};

const cancelAgent = () => {
  store.cancelAgent(agent.id);
};

const removeAgent = () => {
  store.removeAgent(agent.id);
};
</script>

<template>
  <div
    class="bg-surface-800 border border-surface-700 rounded-md p-2.5 flex flex-col gap-2 animate-fade-in">
    <div class="flex items-start justify-between gap-2">
      <button
        class="flex-1 text-left min-w-0"
        @click="toggleExpanded">
        <div class="flex items-center gap-2">
          <i :class="statusIconClass" />
          <component
            :is="agent.status === 'running' ? TextShimmer : 'span'"
            class="text-sm font-medium text-surface-200 truncate">
            {{ agent.title }}
          </component>
        </div>
      </button>
      <div class="flex items-center gap-1">
        <button
          v-if="agent.status === 'running' || agent.status === 'queued'"
          class="h-6 w-6 rounded text-surface-400 hover:text-surface-200 hover:bg-surface-700"
          @click="cancelAgent">
          <i class="fas fa-stop text-xs" />
        </button>
        <button
          class="h-6 w-6 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700"
          @click="removeAgent">
          <i class="fas fa-times text-xs" />
        </button>
      </div>
    </div>

    <Transition name="bg-agent-expand">
      <div
        v-if="agent.expanded"
        class="flex flex-col gap-2">
        <div class="text-sm leading-5 text-surface-300 line-clamp-3">{{ agent.task }}</div>
        <div
          v-if="agent.error !== undefined"
          class="text-xs font-mono leading-4 break-words rounded border border-error-700/40 bg-error-900/20 text-error-300 p-2">
          {{ agent.error }}
        </div>
        <div
          v-if="agent.logs.length > 0"
          ref="logsContainer"
          class="max-h-44 overflow-y-auto custom-scrollbar rounded border border-surface-700/60 bg-surface-900/30 p-2 space-y-1"
          style="scroll-behavior: smooth">
          <div
            v-for="log in agent.logs"
            :key="log.id"
            class="flex items-start gap-2 px-2 py-1.5 rounded-md border border-surface-700/40 bg-surface-800/40 transition-all duration-150"
            :class="{ 'animate-fade-in': log.id === latestLogId }">
            <i
              :class="logIconClass(log)"
              class="mt-0.5 text-[10px] shrink-0" />
            <span
              class="text-xs font-mono leading-4 break-words"
              :class="logTextClass(log)"
              >{{ log.text }}</span
            >
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bg-agent-expand-enter-active,
.bg-agent-expand-leave-active {
  transition: opacity 120ms ease;
}

.bg-agent-expand-enter-from,
.bg-agent-expand-leave-to {
  opacity: 0;
}
</style>
