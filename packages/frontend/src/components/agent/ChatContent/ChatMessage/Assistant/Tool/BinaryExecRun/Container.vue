<script setup lang="ts">
import type { MessageMetadata, PartState } from "shared";
import { toRef } from "vue";

import { useBinaryOutput } from "./useBinaryOutput";

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
  binaryOutput,
  displayBinaryOutput,
  showLiveOutput,
  hasOutput,
  hasStdout,
  hasStderr,
  isExpandable,
  isExpanded,
  toggle,
  formatBytes,
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
          <span :class="{ 'text-surface-500': part.muted }">{{ part.text }}</span>
        </template>
      </TextShimmer>
    </div>

    <div
      v-if="showLiveOutput && binaryOutput"
      class="mt-1.5 rounded border border-surface-700 bg-surface-900/50 overflow-hidden">
      <div
        v-if="hasStdout"
        class="border-b border-surface-700/30 last:border-b-0">
        <div
          v-if="hasStderr"
          class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500 uppercase tracking-wider font-medium">
          stdout
          <span v-if="binaryOutput.stdoutTruncated">
            (truncated, {{ formatBytes(binaryOutput.stdoutBytes) }})
          </span>
        </div>
        <div
          v-else-if="binaryOutput.stdoutTruncated"
          class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500">
          truncated ({{ formatBytes(binaryOutput.stdoutBytes) }})
        </div>
        <pre
          class="max-h-48 overflow-y-auto custom-scrollbar px-2.5 py-1.5 text-surface-300 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words m-0 select-text"
          >{{ displayBinaryOutput?.stdout }}</pre
        >
      </div>

      <div
        v-if="hasStderr"
        class="border-b border-surface-700/30 last:border-b-0">
        <div
          class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500 uppercase tracking-wider font-medium">
          stderr
          <span v-if="binaryOutput.stderrTruncated">
            (truncated, {{ formatBytes(binaryOutput.stderrBytes) }})
          </span>
        </div>
        <pre
          class="max-h-48 overflow-y-auto custom-scrollbar px-2.5 py-1.5 text-surface-300 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words m-0 select-text"
          >{{ displayBinaryOutput?.stderr }}</pre
        >
      </div>
    </div>

    <div
      v-else-if="toolState === 'error'"
      class="flex items-center gap-1.5 h-5 text-surface-500">
      {{ errorMessage }}
    </div>

    <template v-else-if="isExpandable">
      <button
        class="flex items-center gap-1.5 h-5 text-surface-300 group hover:text-surface-200 transition-colors"
        @click="toggle">
        <span class="select-none">
          <template
            v-for="(part, index) in successResult"
            :key="index">
            <span :class="{ 'text-surface-500': part.muted }">{{ part.text }}</span>
          </template>
        </span>
        <i
          class="fas fa-chevron-right text-[10px] text-surface-500 transition-all duration-150 ease-in-out ml-1.5 shrink-0"
          :class="[isExpanded ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100']" />
      </button>

      <div
        v-if="isExpanded && binaryOutput"
        class="mt-1.5 rounded border border-surface-700 bg-surface-900/50 overflow-hidden">
        <div
          v-if="!hasOutput"
          class="text-xs text-surface-500 py-1">
          No output captured
        </div>

        <template v-else>
          <div
            v-if="hasStdout"
            class="border-b border-surface-700/30 last:border-b-0">
            <div
              v-if="hasStderr"
              class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500 uppercase tracking-wider font-medium">
              stdout
              <span v-if="binaryOutput.stdoutTruncated">
                (truncated, {{ formatBytes(binaryOutput.stdoutBytes) }})
              </span>
            </div>
            <div
              v-else-if="binaryOutput.stdoutTruncated"
              class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500">
              truncated ({{ formatBytes(binaryOutput.stdoutBytes) }})
            </div>
            <pre
              class="max-h-48 overflow-y-auto custom-scrollbar px-2.5 py-1.5 text-surface-300 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words m-0 select-text"
              >{{ displayBinaryOutput?.stdout }}</pre
            >
          </div>

          <div
            v-if="hasStderr"
            class="border-b border-surface-700/30 last:border-b-0">
            <div
              class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500 uppercase tracking-wider font-medium">
              stderr
              <span v-if="binaryOutput.stderrTruncated">
                (truncated, {{ formatBytes(binaryOutput.stderrBytes) }})
              </span>
            </div>
            <pre
              class="max-h-48 overflow-y-auto custom-scrollbar px-2.5 py-1.5 text-surface-300 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words m-0 select-text"
              >{{ displayBinaryOutput?.stderr }}</pre
            >
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
