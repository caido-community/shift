<script setup lang="ts">
const { level, size = 12 } = defineProps<{ level: 0 | 1 | 2; size?: number }>();

const bolt =
  "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z";
</script>

<template>
  <svg
    v-if="level === 2"
    viewBox="0 0 28 27"
    class="w-auto shrink-0"
    :style="{ height: `${size}px` }"
    fill="currentColor"
    aria-hidden="true">
    <path
      :d="bolt"
      transform="translate(5 0)"
      opacity="0.45" />
    <path
      :d="bolt"
      transform="translate(0 3)" />
  </svg>
  <svg
    v-else
    viewBox="0 0 24 24"
    class="shrink-0"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :fill="level === 1 ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="level === 1 ? 0 : 2"
    stroke-linejoin="round"
    aria-hidden="true">
    <path :d="bolt" />
  </svg>
</template>
