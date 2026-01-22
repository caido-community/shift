export function formatStringWithSuffix(text: string, maxLength: number, suffix: string): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + suffix;
}

export function truncate(text: string, maxLength: number = 24): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "…";
}
