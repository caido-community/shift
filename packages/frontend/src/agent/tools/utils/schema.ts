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

/** A positive integer id that also accepts numeric strings ("1" -> 1). */
export function idNumber() {
  return z.coerce.number().int().positive();
}

/**
 * Input shape for tools that act on one or more todo ids.
 *
 * Weaker / local models are inconsistent here — they send `ids: [1,2]`, a single
 * `ids: 1`, a singular `id: 1`, or numeric strings like `"1"`. Accept all of them
 * (both keys optional, scalar-or-array, string-coercing) and normalize with
 * `collectIds`. `execute` should error when the result is empty.
 */
export function idListInput(idsDescription: string) {
  return z.object({
    ids: scalarOrArray(idNumber()).optional().describe(idsDescription),
    id: idNumber().optional().describe("Alias accepted for a single id."),
  });
}

export function collectIds(input: { ids?: number | number[]; id?: number }): number[] {
  const list = input.ids === undefined ? [] : toArray(input.ids);
  if (input.id !== undefined) {
    list.push(input.id);
  }
  return list;
}
