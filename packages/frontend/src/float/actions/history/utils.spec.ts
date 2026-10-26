import { describe, expect, it } from "vitest";

import { truncateMiddle } from "./utils";

describe("truncateMiddle", () => {
  it("returns short values unchanged", () => {
    expect(truncateMiddle("abc", 10, () => "|")).toEqual({
      value: "abc",
      truncated: false,
      truncatedCharacters: undefined,
    });
  });

  it("keeps head and tail and reports the exact omitted count in the marker", () => {
    const value = "a".repeat(50) + "b".repeat(50);
    const result = truncateMiddle(value, 40, (omitted) => `[${omitted} omitted]`);

    expect(result.value.length).toBeLessThanOrEqual(40);
    expect(result.value.startsWith("a")).toBe(true);
    expect(result.value.endsWith("b")).toBe(true);
    expect(result.value).toContain(`[${result.truncatedCharacters} omitted]`);
    expect(result.value.length - `[${result.truncatedCharacters} omitted]`.length).toBe(
      100 - (result.truncatedCharacters ?? 0)
    );
  });
});
