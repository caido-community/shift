const TRUNCATION_MARKER = "\n...[truncated]...\n";

export function truncateContextValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= TRUNCATION_MARKER.length + 2) {
    return value.slice(0, maxLength);
  }

  const remaining = maxLength - TRUNCATION_MARKER.length;
  const headLength = Math.ceil(remaining / 2);
  const tailLength = Math.max(0, remaining - headLength);

  return `${value.slice(0, headLength)}${TRUNCATION_MARKER}${value.slice(value.length - tailLength)}`;
}
