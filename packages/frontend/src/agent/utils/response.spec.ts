import { describe, expect, it } from "vitest";

import { readContentRange, searchInContent } from "./response";

describe("searchInContent", () => {
  describe("basic search", () => {
    it("finds single occurrence", () => {
      const result = searchInContent("hello world", "world", true);

      expect(result.totalOccurrences).toBe(1);
      expect(result.returnedOccurrences).toBe(1);
      expect(result.occurrences[0]?.startIndex).toBe(6);
      expect(result.occurrences[0]?.endIndex).toBe(11);
    });

    it("finds multiple occurrences", () => {
      const result = searchInContent("foo bar foo baz foo", "foo", true);

      expect(result.totalOccurrences).toBe(3);
      expect(result.returnedOccurrences).toBe(3);
      expect(result.occurrences[0]?.startIndex).toBe(0);
      expect(result.occurrences[1]?.startIndex).toBe(8);
      expect(result.occurrences[2]?.startIndex).toBe(16);
    });

    it("returns empty when pattern not found", () => {
      const result = searchInContent("hello world", "xyz", true);

      expect(result.totalOccurrences).toBe(0);
      expect(result.returnedOccurrences).toBe(0);
      expect(result.occurrences).toEqual([]);
    });
  });

  describe("case sensitivity", () => {
    it("respects case sensitive search", () => {
      const result = searchInContent("Hello HELLO hello", "hello", true);

      expect(result.totalOccurrences).toBe(1);
      expect(result.occurrences[0]?.startIndex).toBe(12);
    });

    it("handles case insensitive search", () => {
      const result = searchInContent("Hello HELLO hello", "hello", false);

      expect(result.totalOccurrences).toBe(3);
    });
  });

  describe("context extraction", () => {
    it("includes surrounding context", () => {
      const result = searchInContent("prefix TARGET suffix", "TARGET", true);

      expect(result.occurrences[0]?.context).toBe("prefix TARGET suffix");
    });

    it("adds ellipsis for long content before match", () => {
      const longPrefix = "a".repeat(100);
      const result = searchInContent(`${longPrefix}TARGET`, "TARGET", true);

      expect(result.occurrences[0]?.context).toContain("...");
      expect(result.occurrences[0]?.context).toContain("TARGET");
    });

    it("adds ellipsis for long content after match", () => {
      const longSuffix = "a".repeat(100);
      const result = searchInContent(`TARGET${longSuffix}`, "TARGET", true);

      expect(result.occurrences[0]?.context).toContain("TARGET");
      expect(result.occurrences[0]?.context).toContain("...");
    });
  });

  describe("occurrence limiting", () => {
    it("limits returned occurrences to 20", () => {
      const content = "x ".repeat(50);
      const result = searchInContent(content, "x", true);

      expect(result.totalOccurrences).toBe(50);
      expect(result.returnedOccurrences).toBe(20);
      expect(result.occurrences.length).toBe(20);
    });

    it("tracks correct indices even when limited", () => {
      const content = "x ".repeat(50);
      const result = searchInContent(content, "x", true);

      expect(result.occurrences[0]?.index).toBe(0);
      expect(result.occurrences[19]?.index).toBe(19);
    });
  });

  describe("minified code handling", () => {
    it("works with single long line", () => {
      const minified = "function(){" + "a=1;".repeat(100) + "}";
      const result = searchInContent(minified, "a=1;", true);

      expect(result.totalOccurrences).toBe(100);
      expect(result.returnedOccurrences).toBe(20);
    });
  });
});

describe("readContentRange", () => {
  describe("basic reading", () => {
    it("reads specified range", () => {
      const result = readContentRange("hello world", 0, 5);

      expect(result.content).toBe("hello");
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(5);
      expect(result.truncated).toBe(false);
    });

    it("reads from middle of content", () => {
      const result = readContentRange("hello world", 6, 11);

      expect(result.content).toBe("world");
    });
  });

  describe("boundary handling", () => {
    it("clamps end index to content length", () => {
      const result = readContentRange("hello", 0, 100);

      expect(result.content).toBe("hello");
      expect(result.endIndex).toBe(5);
      expect(result.truncated).toBe(false);
    });
  });

  describe("truncation", () => {
    it("truncates content exceeding max length", () => {
      const longContent = "x".repeat(10000);
      const result = readContentRange(longContent, 0, 10000);

      expect(result.content.length).toBe(5000);
      expect(result.truncated).toBe(true);
      expect(result.endIndex).toBe(5000);
    });

    it("does not truncate content within max length", () => {
      const content = "x".repeat(4000);
      const result = readContentRange(content, 0, 4000);

      expect(result.content.length).toBe(4000);
      expect(result.truncated).toBe(false);
    });

    it("truncates based on requested range, not content length", () => {
      const longContent = "x".repeat(10000);
      const result = readContentRange(longContent, 0, 6000);

      expect(result.truncated).toBe(true);
      expect(result.endIndex).toBe(5000);
    });
  });
});
