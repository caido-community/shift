<script setup lang="ts">
import { type BinaryStream } from "./useBinaryOutput";

const { streams } = defineProps<{ streams: BinaryStream[] }>();

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
</script>

<template>
  <div class="mt-1.5 rounded border border-surface-700 bg-surface-900/50 overflow-hidden">
    <div
      v-if="streams.length === 0"
      class="text-xs text-surface-500 py-1">
      No output captured
    </div>

    <div
      v-for="stream in streams"
      :key="stream.name"
      class="border-b border-surface-700/30 last:border-b-0">
      <div
        v-if="streams.length > 1 || stream.name === 'stderr'"
        class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500 uppercase tracking-wider font-medium">
        {{ stream.name }}
        <span v-if="stream.truncated"> (truncated, {{ formatBytes(stream.bytes) }}) </span>
      </div>
      <div
        v-else-if="stream.truncated"
        class="px-2.5 pt-1.5 pb-0.5 text-[10px] text-surface-500">
        truncated ({{ formatBytes(stream.bytes) }})
      </div>
      <pre
        class="max-h-48 overflow-y-auto custom-scrollbar px-2.5 py-1.5 text-surface-300 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words m-0 select-text"
        >{{ stream.text }}</pre
      >
    </div>
  </div>
</template>
