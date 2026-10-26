<script setup lang="ts">
import type { MessageMetadata, PartState } from "shared";
import { toRef } from "vue";

import OutputPanel from "./OutputPanel.vue";
import { useBinaryOutput } from "./useBinaryOutput";

import { formatToolDisplayText } from "@/agent/utils/formatting";
import { TextShimmer } from "@/components/common/TextShimmer";

const { toolCallId, partState, messageMetadata, input, output, errorText } = defineProps<{
  toolCallId: string;
  partState: PartState;
  messageMetadata: MessageMetadata | undefined;
  input: unknown;
  output: unknown;
  errorText: string | undefined;
}>();

const {
  toolState,
  errorMessage,
  streamingResult,
  successResult,
  streams,
  showLiveOutput,
  isExpandable,
  isExpanded,
  toggle,
} = useBinaryOutput({
  executionId: toRef(() => toolCallId),
  partState: toRef(() => partState),
  messageMetadata: toRef(() => messageMetadata),
  input: toRef(() => input),
  output: toRef(() => output),
  errorText: toRef(() => errorText),
});
</script>

<template>
  <div class="text-sm animate-fade-in">
    <div
      v-if="toolState === 'streaming' || toolState === 'pending'"
      class="flex items-center gap-1.5 h-5 text-surface-300">
      <TextShimmer>
        <template
          v-for="(part, index) in streamingResult"
          :key="index">
          <span :class="{ 'text-surface-500': part.muted }">
            {{ formatToolDisplayText(part.text) }}
          </span>
        </template>
      </TextShimmer>
    </div>

    <OutputPanel
      v-if="showLiveOutput"
      :streams="streams" />

    <div
      v-else-if="toolState === 'error'"
      class="flex items-center gap-1.5 h-5 text-surface-500">
      {{ errorMessage }}
    </div>

    <template v-else-if="isExpandable">
      <button
        class="flex items-center gap-1.5 h-5 min-w-0 max-w-full text-surface-300 group hover:!text-surface-100 transition-colors"
        @click="toggle">
        <span class="select-none min-w-0 truncate">
          <template
            v-for="(part, index) in successResult"
            :key="index">
            <span
              :class="{
                'text-surface-500 group-hover:!text-surface-200 transition-colors': part.muted,
              }">
              {{ formatToolDisplayText(part.text) }}
            </span>
          </template>
        </span>
        <i
          class="fas fa-chevron-right text-[10px] text-surface-500 transition-all duration-150 ease-in-out ml-1.5 shrink-0"
          :class="[isExpanded ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:!opacity-100']" />
      </button>

      <OutputPanel
        v-if="isExpanded"
        :streams="streams" />
    </template>
  </div>
</template>
