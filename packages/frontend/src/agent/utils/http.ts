export function normalizeCRLF(input: string): string {
  return input.replace(/\r?\n/g, "\r\n");
}

export function normalizeRawHttpRequest(input: string): string {
  const normalized = normalizeCRLF(input);
  if (normalized === "" || normalized.includes("\r\n\r\n")) {
    return normalized;
  }
  return normalized.endsWith("\r\n") ? `${normalized}\r\n` : `${normalized}\r\n\r\n`;
}
