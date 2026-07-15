import { z } from "zod";

/**
 * Accept either a single item or an array of items for an array-typed tool input.
 *
 * Weaker / local models (e.g. qwen via Ollama) frequently emit a bare scalar
 * (`"content": "x"`) where the schema expects an array (`["x"]`). A strict
 * `z.array(...)` rejects that, the tool never executes, no `tool` result is
 * produced, and the model loops re-issuing the same call. Accepting both shapes
 * lets validation pass on the first try; use `toArray` to normalize in `execute`.
 *
 * The generated JSON schema becomes an `anyOf` of the array and the single item,
 * which still tells the model an array is the expected shape.
 */
export function scalarOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([z.array(item), item]);
}

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
