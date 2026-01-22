export function generateId(length = 6): string {
  return Array.from({ length }, () => Math.random().toString(36).charAt(2)).join("");
}
