<script setup lang="ts">
import { computed } from "vue";

import amazonBedrock from "./logos/amazon-bedrock.svg?inline";
import anthropic from "./logos/anthropic.svg?inline";
import google from "./logos/google.svg?inline";
import openai from "./logos/openai.svg?inline";
import openrouter from "./logos/openrouter.svg?inline";
import xai from "./logos/xai.svg?inline";

// Monochrome logos render as masks so they take the surrounding text color.
const logos: Record<string, { src: string; mono: boolean }> = {
  anthropic: { src: anthropic, mono: false },
  "amazon-bedrock": { src: amazonBedrock, mono: false },
  google: { src: google, mono: false },
  openai: { src: openai, mono: true },
  openrouter: { src: openrouter, mono: true },
  xai: { src: xai, mono: true },
};

const { icon, size = 14 } = defineProps<{ icon: string; size?: number }>();

const logo = computed(() => logos[icon]);
const style = computed(() => ({
  width: `${size}px`,
  height: `${size}px`,
  fontSize: `${size - 2}px`,
}));
const maskStyle = computed(() => ({
  ...style.value,
  mask: `url("${logo.value?.src}") center / contain no-repeat`,
}));
</script>

<template>
  <span
    v-if="logo?.mono"
    class="inline-block shrink-0 bg-current"
    :style="maskStyle"
    aria-hidden="true" />
  <img
    v-else-if="logo !== undefined"
    :src="logo.src"
    alt=""
    class="shrink-0"
    :style="style" />
  <i
    v-else
    class="fas fa-server inline-flex shrink-0 items-center justify-center"
    :style="style"
    aria-hidden="true" />
</template>
