export function normalizeCRLF(input: string): string {
  return input.replace(/\r?\n/g, "\r\n");
}
