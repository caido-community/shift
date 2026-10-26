export function truncate(text: string | undefined, maxLength: number = 24, suffix = "…"): string {
  if (typeof text !== "string") {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + suffix;
}
