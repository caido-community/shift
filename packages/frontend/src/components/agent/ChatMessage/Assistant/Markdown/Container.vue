<script setup lang="ts">
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed } from "vue";

const { content } = defineProps<{ content: string }>();

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

const rendered = computed(() => {
  const rendered = md.render(content);
  return DOMPurify.sanitize(rendered);
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="prose prose-compact dark:prose-invert break-words select-text font-mono"
    v-html="rendered"
  ></div>
  <!-- eslint-enable vue/no-v-html -->
</template>
