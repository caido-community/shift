<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed, useAttrs } from "vue";

import "./style.css";

import { toHttpBlockLines } from "@/agent/utils/httpBlock";
import { isPresent } from "@/utils/optional";

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

const renderHttpBlock = (source: string) => {
  const lines = toHttpBlockLines(source.replace(/\n$/, "")).map((segments) =>
    segments
      .map((segment) => {
        const text = md.utils.escapeHtml(segment.text);
        const colored =
          segment.color === undefined
            ? text
            : `<span style="color:${segment.color}">${text}</span>`;
        return segment.marked ? `<mark>${colored}</mark>` : colored;
      })
      .join("")
  );
  return `<pre><code>${lines.join("\n")}</code></pre>`;
};

const renderFence = md.renderer.rules.fence!;
md.renderer.rules.fence = (tokens, index, ...rest) => {
  const token = tokens[index]!;
  const code =
    token.info.trim() === "http"
      ? renderHttpBlock(token.content)
      : renderFence(tokens, index, ...rest);
  return `<div class="code-block">${code}<button type="button" class="fas fa-copy" title="Copy code" data-copy-code></button></div>`;
};

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
