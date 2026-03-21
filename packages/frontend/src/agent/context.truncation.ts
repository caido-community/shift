type TruncationOptions = {
  retrievalHint?: string;
};

function buildTruncationMarker(remainingChars: number, options?: TruncationOptions): string {
  const hint = options?.retrievalHint?.trim();
  const suffix = hint !== undefined && hint !== "" ? ` ${hint}` : "";
  return `\n[...truncated. ${remainingChars} chars remaining.${suffix}]\n`;
}

export function truncateContextValue(
  value: string,
  maxLength: number,
  options?: TruncationOptions
): string {
  if (value.length <= maxLength) {
    return value;
  }

  const remainingChars = Math.max(0, value.length - maxLength);
  const truncationMarker = buildTruncationMarker(remainingChars, options);

  if (maxLength <= truncationMarker.length + 2) {
    return value.slice(0, maxLength);
  }

  const remaining = maxLength - truncationMarker.length;
  const headLength = Math.ceil(remaining / 2);
  const tailLength = Math.max(0, remaining - headLength);

  return `${value.slice(0, headLength)}${truncationMarker}${value.slice(
    value.length - tailLength
  )}`;
}
