import { useClipboard } from "@vueuse/core";
import DOMPurify from "dompurify";
import { computed, type MaybeRefOrGetter, toValue, useTemplateRef, watch } from "vue";

import { renderMarkdownBlocks } from "./render";

import { isPresent } from "@/utils/optional";

export function useMarkdown(text: MaybeRefOrGetter<string>) {
  const root = useTemplateRef<HTMLElement>("root");
  const blocks = computed(() => renderMarkdownBlocks(toValue(text)));
  const { copy } = useClipboard();

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

  function handleClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest("[data-copy-code]");
    const code = button?.parentElement?.querySelector("pre")?.textContent;
    if (!isPresent(button) || !isPresent(code)) return;

    copy(code.trimEnd());
    button.classList.replace("fa-copy", "fa-check");
    setTimeout(() => button.classList.replace("fa-check", "fa-copy"), 1000);
  }

  return { handleClick };
}
