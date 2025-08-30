<script setup lang="ts">
import { toRefs } from "vue";

import { useToolMessage } from "./useMessage";

import type { MessageState } from "@/agents/types";

const props = defineProps<{
  toolName: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  output: unknown;
  messageState: MessageState | undefined;
}>();

const { toolName, state, output, messageState } = toRefs(props);

const {
  isProcessing,
  formatToolCall,
  toolDetails,
  showDetails,
  toggleDetails,
  toolIcon,
} = useToolMessage({ toolName, state, output, messageState });
</script>

<template>
  <div class="flex flex-col gap-2 text-surface-300 py-1">
    <div class="group flex items-center gap-2 hover:text-surface-200">
      <i
        v-if="toolIcon"
        :class="toolIcon"
        class="text-sm text-surface-200 w-4"
      />
      <span
        class="text-sm font-mono font-thin flex items-center gap-1 justify-between w-full overflow-hidden text-ellipsis text-nowrap"
        :class="[
          toolDetails ? 'cursor-pointer' : '',
          isProcessing ? 'shimmer' : '',
        ]"
        @click="toggleDetails"
      >
        {{ formatToolCall }}
        <i
          v-if="toolDetails"
          class="text-sm w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          :class="showDetails ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
        />
      </span>
    </div>

    <div v-if="showDetails && toolDetails" class="w-full">
      <pre class="text-xs text-surface-300 font-mono whitespace-pre-wrap">{{
        toolDetails
      }}</pre>
    </div>
  </div>
</template>
