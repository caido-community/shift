<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed, useAttrs } from "vue";

import "./style.css";

import { isPresent } from "@/utils/optional";

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

const renderFence = md.renderer.rules.fence!;
md.renderer.rules.fence = (...args) =>
  `<div class="code-block">${renderFence(...args)}<button type="button" class="fas fa-copy" title="Copy code" data-copy-code></button></div>`;

const { text } = defineProps<{ text: string }>();
const attrs = useAttrs();

const rendered = computed(() => {
  const html = md.render(text);
  return DOMPurify.sanitize(html);
});

const { copy } = useClipboard();

function handleClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest("[data-copy-code]");
  const code = button?.parentElement?.querySelector("pre")?.textContent;
  if (!isPresent(button) || !isPresent(code)) return;

  copy(code.trimEnd());
  button.classList.replace("fa-copy", "fa-check");
  setTimeout(() => button.classList.replace("fa-check", "fa-copy"), 1000);
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    v-if="text.length > 0"
    v-bind="attrs"
    data-component="markdown"
    @click="handleClick"
    v-html="rendered"></div>
  <!-- eslint-enable vue/no-v-html -->
</template>
