<script setup lang="ts">
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed, useAttrs } from "vue";

import "./style.css";

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

const { text } = defineProps<{ text: string }>();
const attrs = useAttrs();

const rendered = computed(() => {
  const html = md.render(text);
  return DOMPurify.sanitize(html);
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="text.length > 0"
    v-bind="attrs"
    data-component="markdown"
    v-html="rendered"></div>
  <!-- eslint-enable vue/no-v-html -->
</template>
