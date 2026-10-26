<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { computed, useAttrs, useTemplateRef, watch } from "vue";

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

const blocks = computed(() => {
  const env = {};
  const tokens = md.parse(text, env);
  const starts = tokens.flatMap((token, index) =>
    token.level === 0 && token.nesting !== -1 ? [index] : []
  );
  return starts.map((start, i) =>
    md.renderer.render(tokens.slice(start, starts[i + 1]), md.options, env)
  );
});

const root = useTemplateRef<HTMLElement>("root");

// Patch per block so finished blocks keep their DOM node (hover, transitions, selection) while streaming.
watch([root, blocks], ([element, next], [previousElement, previous]) => {
  if (!isPresent(element)) return;
  const rendered = element === previousElement ? previous : [];

  next.forEach((html, index) => {
    if (html === rendered[index]) return;
    const node =
      DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true }).firstElementChild ??
      document.createElement("div");
    const current = element.children[index];
    if (isPresent(current)) current.replaceWith(node);
    else element.append(node);
  });

  while (element.children.length > next.length) element.lastElementChild?.remove();
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
  <div
    v-if="text.length > 0"
    ref="root"
    v-bind="attrs"
    data-component="markdown"
    @click="handleClick"></div>
</template>
