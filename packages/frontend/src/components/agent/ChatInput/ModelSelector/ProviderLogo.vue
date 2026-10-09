<script setup lang="ts">
import { computed } from "vue";

import { PROVIDER_LOGOS } from "./logos";

const { icon, size = 14 } = defineProps<{ icon: string; size?: number }>();

const logo = computed(() => PROVIDER_LOGOS[icon]);
const style = computed(() => ({
  width: `${size}px`,
  height: `${size}px`,
  fontSize: `${size - 2}px`,
}));
</script>

<template>
  <svg
    v-if="logo !== undefined"
    :viewBox="logo.viewBox"
    :fill="logo.color ?? 'currentColor'"
    class="shrink-0 text-surface-0"
    :style="style"
    aria-hidden="true">
    <path :d="logo.path" />
  </svg>
  <i
    v-else
    class="fas fa-server inline-flex shrink-0 items-center justify-center"
    :style="style"
    aria-hidden="true" />
</template>
