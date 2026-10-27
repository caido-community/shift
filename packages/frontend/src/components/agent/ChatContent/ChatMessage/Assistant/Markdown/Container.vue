<script setup lang="ts">
import { useAttrs } from "vue";

import "./style.css";
import { useMarkdown } from "./useMarkdown";

const { text } = defineProps<{ text: string }>();
const attrs = useAttrs();

const { handleClick } = useMarkdown(() => text);
</script>

<template>
  <div
    v-if="text.length > 0"
    ref="root"
    v-bind="attrs"
    data-component="markdown"
    @click="handleClick"></div>
</template>
