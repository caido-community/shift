<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { computed, toRefs } from "vue";

const props = defineProps<{ content: string }>();
const { content } = toRefs(props);

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

const rendered = computed(() => md.render(content.value));
</script>

<template>
  <div
    class="prose prose-compact dark:prose-invert break-words select-text font-mono"
    v-html="rendered"
  ></div>
</template>
