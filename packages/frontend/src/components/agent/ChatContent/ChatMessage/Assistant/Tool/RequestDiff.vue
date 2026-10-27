<script setup lang="ts">
import type { RequestDiff } from "shared";
import { computed } from "vue";

import { toHttpSegments } from "@/agent/utils/httpBlock";
import { pluralize } from "@/utils";

const { diff } = defineProps<{ diff: RequestDiff }>();

const rows = computed(() =>
  diff.lines.map((line) => ({
    ...line,
    segments: toHttpSegments(line, line.changedRange === undefined ? [] : [line.changedRange]),
  }))
);

const styles = {
  add: {
    row: "bg-[hsl(var(--c-success-400)/0.14)]",
    mark: "rounded-sm bg-[hsl(var(--c-success-400)/0.38)]",
  },
  del: {
    row: "bg-[hsl(var(--c-danger-400)/0.13)]",
    mark: "rounded-sm bg-[hsl(var(--c-danger-400)/0.36)]",
  },
};
</script>

<template>
  <div
    class="rounded-md border border-surface-700 bg-surface-900 py-1 font-mono text-xs leading-5 select-text">
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="flex"
      :class="styles[row.op].row">
      <span class="w-9 shrink-0 pr-2 text-right text-white/50 select-none">{{ row.line }}</span>
      <span class="flex-1 min-w-0 pr-2.5 whitespace-pre-wrap break-all text-surface-0"
        ><span
          v-for="(segment, segmentIndex) in row.segments"
          :key="segmentIndex"
          :style="{ color: segment.color }"
          :class="segment.marked ? styles[row.op].mark : undefined"
          >{{ segment.text }}</span
        ></span
      >
    </div>
    <div
      v-if="diff.omittedLines > 0"
      class="pl-9 pr-2.5 text-surface-500 select-none">
      {{ diff.omittedLines }} more changed {{ pluralize(diff.omittedLines, "line") }}
    </div>
  </div>
</template>
