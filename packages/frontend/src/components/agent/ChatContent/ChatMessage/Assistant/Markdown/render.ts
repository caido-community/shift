import MarkdownIt from "markdown-it";

import { toHttpBlockLines } from "@/agent/utils/httpBlock";

const md = new MarkdownIt({
  breaks: true,
  linkify: false,
});

function renderHttpBlock(source: string) {
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
}

const renderFence = md.renderer.rules.fence!;
md.renderer.rules.fence = (tokens, index, ...rest) => {
  const token = tokens[index]!;
  const code =
    token.info.trim() === "http"
      ? renderHttpBlock(token.content)
      : renderFence(tokens, index, ...rest);
  return `<div class="code-block">${code}<button type="button" class="fas fa-copy" title="Copy code" data-copy-code></button></div>`;
};

export function renderMarkdownBlocks(text: string): string[] {
  const env = {};
  const tokens = md.parse(text, env);
  const starts = tokens.flatMap((token, index) =>
    token.level === 0 && token.nesting !== -1 ? [index] : []
  );
  return starts.map((start, i) =>
    md.renderer.render(tokens.slice(start, starts[i + 1]), md.options, env)
  );
}
