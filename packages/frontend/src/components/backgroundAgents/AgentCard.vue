<script setup lang="ts">
import { toRef } from "vue";

import { type BackgroundAgent } from "@/stores/backgroundAgents";

import { useAgentCard } from "./useAgentCard";
import { useAgentCardLogs } from "./useAgentCardLogs";
import { useAgentCardResize } from "./useAgentCardResize";

const props = defineProps<{
  agent: BackgroundAgent;
}>();

const agent = toRef(props, "agent");

const {
  canCancel,
  statusIconClass,
  titleTag,
  toggleExpanded,
  cancelAgent,
  removeAgent,
  logIconClass,
  logTextClass,
} = useAgentCard(agent);
const { latestLogId } = useAgentCardLogs(agent);
const { activeHandle, cardStyle, resizeCursorClass, startResize } = useAgentCardResize(
  () => agent.value.expanded
);
</script>

<template>
  <div
    ref="cardElement"
    class="relative shrink-0 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden bg-surface-800 border border-surface-700 rounded-md p-2.5 flex flex-col gap-2 animate-fade-in"
    :class="resizeCursorClass"
    :style="cardStyle">
    <div
      class="absolute left-0 top-0 z-20 h-3 w-3 cursor-ew-resize rounded-tl-md transition-colors hover:bg-secondary-500/50"
      :class="{ 'bg-secondary-500/50': activeHandle === 'top-left' }"
      @mousedown="startResize('top-left', $event)" />
    <div class="flex items-start justify-between gap-2">
      <button
        class="flex-1 text-left min-w-0"
        @click="toggleExpanded">
        <div class="flex items-center gap-2">
          <i :class="statusIconClass" />
          <component
            :is="titleTag"
            class="text-sm font-medium text-surface-200 truncate">
            {{ agent.title }}
          </component>
        </div>
      </button>
      <div class="flex items-center gap-1">
        <button
          v-if="canCancel"
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
        class="flex min-h-0 flex-1 flex-col gap-2">
        <div class="shrink-0 text-sm leading-5 text-surface-300 line-clamp-3">{{ agent.task }}</div>
        <div
          v-if="agent.error !== undefined"
          class="shrink-0 text-xs font-mono leading-4 break-words rounded border border-error-700/40 bg-error-900/20 text-error-300 p-2">
          {{ agent.error }}
        </div>
        <div
          v-if="agent.logs.length > 0"
          ref="logsContainer"
          class="min-h-0 flex-1 overflow-y-auto custom-scrollbar rounded border border-surface-700/60 bg-surface-900/30 p-2 space-y-1"
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
    <template v-if="agent.expanded">
      <div
        class="absolute bottom-0 left-0 z-20 h-3 w-3 cursor-nesw-resize rounded-bl-md transition-colors hover:bg-secondary-500/50"
        :class="{ 'bg-secondary-500/50': activeHandle === 'bottom-left' }"
        @mousedown="startResize('bottom-left', $event)" />
      <div
        class="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-ns-resize rounded-br-md transition-colors hover:bg-secondary-500/50"
        :class="{ 'bg-secondary-500/50': activeHandle === 'bottom-right' }"
        @mousedown="startResize('bottom-right', $event)" />
    </template>
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
