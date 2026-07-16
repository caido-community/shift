export function formatStringWithSuffix(text: string, maxLength: number, suffix: string): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + suffix;
}

export function truncate(text: string | undefined, maxLength: number = 24): string {
  if (typeof text !== "string") {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "…";
}

const THINK_TAG_REGEX = /<think>[\s\S]*?<\/think>/gi;
const DANGLING_THINK_REGEX = /<think>[\s\S]*$/i;

/**
 * Strip inline `<think>...</think>` reasoning blocks from model text.
 *
 * Models like qwen served via Ollama/LiteLLM emit reasoning inline in the text
 * content (often as empty `<think></think>` blocks) rather than as a dedicated
 * reasoning part, so it renders as literal clutter. This removes complete blocks
 * and, when `stripDangling` is set (during streaming), a trailing unclosed
 * `<think>` and everything after it so partial reasoning never flashes.
 */
export function stripThinkTags(text: string, options?: { stripDangling?: boolean }): string {
  let result = text.replace(THINK_TAG_REGEX, "");
  if (options?.stripDangling === true) {
    result = result.replace(DANGLING_THINK_REGEX, "");
  }
  return result.trim();
}

export function hasThinkTag(text: string): boolean {
  return text.includes("<think>");
}
