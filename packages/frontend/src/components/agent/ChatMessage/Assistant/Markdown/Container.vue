<script setup lang="ts">
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed, toRefs } from "vue";

const props = defineProps<{ content: string }>();
const { content } = toRefs(props);

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

const rendered = computed(() => {
  const rendered = md.render(content.value);
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
