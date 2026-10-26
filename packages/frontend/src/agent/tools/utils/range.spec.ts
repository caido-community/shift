import { describe, expect, it } from "vitest";

import { readTextRange } from "./range";

describe("readTextRange", () => {
  it("supports pagination", () => {
    const result = readTextRange("abcdefghij", "blob", 2, 4);
    expect(result).toMatchObject({
      kind: "Ok",
      value: { content: "cdef", offset: 2, endOffset: 6, hasMore: true },
    });
  });

  it("rejects offsets at or past the end", () => {
    expect(readTextRange("abc", "learning #0", 3, 10)).toEqual({
      kind: "Error",
      error: { message: "Offset out of bounds", detail: "Offset 3 exceeds learning #0 length 3" },
    });
  });
});
