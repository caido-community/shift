import { describe, expect, it } from "vitest";

import { truncateContextValue } from "./context.truncation";

const TRUNCATION_MARKER = "\n...[truncated]...\n";

describe("truncateContextValue", () => {
  it("returns value unchanged when within maxLength", () => {
    const value = "short text";
    expect(truncateContextValue(value, 100)).toBe(value);
  });

  it("returns value unchanged when exactly at maxLength", () => {
    const value = "a".repeat(50);
    expect(truncateContextValue(value, 50)).toBe(value);
  });

  it("uses head+tail truncation with marker when value exceeds maxLength", () => {
    const value = "a".repeat(50);
    const maxLength = 40; // must be > TRUNCATION_MARKER.length + 2 to use head+tail
    const result = truncateContextValue(value, maxLength);

    expect(result).toContain(TRUNCATION_MARKER);
    expect(result.length).toBe(maxLength);
    const remaining = maxLength - TRUNCATION_MARKER.length;
    const headLen = Math.ceil(remaining / 2);
    const tailLen = remaining - headLen;
    expect(result.startsWith("a".repeat(headLen)));
    expect(result.endsWith("a".repeat(tailLen)));
  });

  it("includes truncation marker in output", () => {
    const value = "x".repeat(100);
    const result = truncateContextValue(value, 50);
    expect(result).toContain("...[truncated]...");
  });

  it("returns head-only when maxLength is too small for head+tail", () => {
    const value = "abcdefghijklmnop";
    const result = truncateContextValue(value, 10);
    expect(result).not.toContain(TRUNCATION_MARKER);
    expect(result).toBe(value.slice(0, 10));
  });

  it("splits remaining space evenly between head and tail", () => {
    const value = "a".repeat(100);
    const maxLength = 40;
    const result = truncateContextValue(value, maxLength);

    const markerLen = TRUNCATION_MARKER.length;
    const remaining = maxLength - markerLen;
    const expectedHeadLen = Math.ceil(remaining / 2);
    const expectedTailLen = remaining - expectedHeadLen;

    expect(result.slice(0, expectedHeadLen)).toBe("a".repeat(expectedHeadLen));
    expect(result.slice(-expectedTailLen)).toBe("a".repeat(expectedTailLen));
  });
});
