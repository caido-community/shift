import { describe, expect, it } from "vitest";

import { replaceUniqueText } from "./text";

describe("replaceUniqueText", () => {
  describe("error cases", () => {
    it("returns error when oldText is not found", () => {
      const result = replaceUniqueText("hello world", "foo", "bar");

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toBe("Text not found");
      }
    });

    it("returns error when oldText appears multiple times", () => {
      const result = replaceUniqueText("hello hello world", "hello", "hi");

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toBe("Found 2 occurrences. Text must be unique.");
      }
    });

    it("returns error with correct occurrence count for many matches", () => {
      const result = replaceUniqueText("a a a a a", "a", "b");

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toBe("Found 5 occurrences. Text must be unique.");
      }
    });

    it("returns error when replacement produces identical content", () => {
      const result = replaceUniqueText("hello world", "world", "world");

      expect(result.kind).toBe("Error");
      if (result.kind === "Error") {
        expect(result.error).toBe("No changes made");
      }
    });
  });

  describe("success cases", () => {
    it("replaces single occurrence at start", () => {
      const result = replaceUniqueText("hello world", "hello", "hi");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.before).toBe("hello world");
        expect(result.value.after).toBe("hi world");
      }
    });

    it("replaces single occurrence at end", () => {
      const result = replaceUniqueText("hello world", "world", "universe");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.after).toBe("hello universe");
      }
    });

    it("replaces single occurrence in middle", () => {
      const result = replaceUniqueText("the quick fox", "quick", "slow");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.after).toBe("the slow fox");
      }
    });

    it("handles replacement with empty string", () => {
      const result = replaceUniqueText("hello world", " world", "");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.after).toBe("hello");
      }
    });

    it("handles replacement with longer string", () => {
      const result = replaceUniqueText("hi", "hi", "hello world");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.after).toBe("hello world");
      }
    });

    it("preserves whitespace and special characters", () => {
      const result = replaceUniqueText("GET /api HTTP/1.1\r\n", "GET", "POST");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.after).toBe("POST /api HTTP/1.1\r\n");
      }
    });

    it("handles multiline text", () => {
      const text = "line1\nline2\nline3";
      const result = replaceUniqueText(text, "line2", "replaced");

      expect(result.kind).toBe("Ok");
      if (result.kind === "Ok") {
        expect(result.value.after).toBe("line1\nreplaced\nline3");
      }
    });
  });
});
