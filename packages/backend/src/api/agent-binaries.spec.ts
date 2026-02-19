import { Buffer } from "buffer";

import { describe, expect, it } from "vitest";

import {
  appendStreamChunk,
  createStreamCollector,
  validateArgs,
  validateStdin,
} from "./agent-binaries.utils";

describe("validateArgs", () => {
  it("accepts valid args", () => {
    const result = validateArgs(["--flag", "value"]);
    expect(result.kind).toBe("Ok");
  });

  it("accepts empty args", () => {
    const result = validateArgs([]);
    expect(result.kind).toBe("Ok");
  });

  it("rejects too many args", () => {
    const args = Array.from({ length: 33 }, (_, i) => String(i));
    const result = validateArgs(args);
    expect(result).toEqual({ kind: "Error", error: "Too many arguments (max 32)" });
  });

  it("rejects args with NUL bytes", () => {
    const result = validateArgs(["hello\0world"]);
    expect(result).toEqual({ kind: "Error", error: "Arguments cannot contain NUL bytes" });
  });

  it("rejects a single arg that is too long", () => {
    const result = validateArgs(["a".repeat(2_049)]);
    expect(result).toEqual({ kind: "Error", error: "Argument exceeds 2048 characters" });
  });

  it("rejects args when total byte size exceeds limit", () => {
    const args = Array.from({ length: 10 }, () => "a".repeat(2_000));
    const result = validateArgs(args);
    expect(result).toEqual({ kind: "Error", error: "Arguments exceed 16384 bytes" });
  });
});

describe("validateStdin", () => {
  it("accepts undefined stdin", () => {
    const result = validateStdin(undefined);
    expect(result.kind).toBe("Ok");
  });

  it("accepts small stdin", () => {
    const result = validateStdin("hello");
    expect(result.kind).toBe("Ok");
  });

  it("rejects stdin exceeding the byte limit", () => {
    const result = validateStdin("a".repeat(65_537));
    expect(result).toEqual({ kind: "Error", error: "stdin exceeds 65536 bytes" });
  });
});

describe("appendStreamChunk", () => {
  it("appends a chunk within the limit", () => {
    const stream = createStreamCollector();
    const result = appendStreamChunk(stream, "hello");

    expect(result).toBeDefined();
    expect(result?.toString("utf8")).toBe("hello");
    expect(stream.bytes).toBe(5);
    expect(stream.truncated).toBe(false);
  });

  it("truncates a chunk that exceeds the remaining capacity", () => {
    const stream = createStreamCollector();
    stream.bytes = 65_530;
    stream.chunks.push(Buffer.alloc(65_530));

    const result = appendStreamChunk(stream, "a".repeat(100));

    expect(result).toBeDefined();
    expect(result?.length).toBe(6);
    expect(stream.bytes).toBe(65_536);
    expect(stream.truncated).toBe(true);
  });

  it("returns undefined when already at capacity", () => {
    const stream = createStreamCollector();
    stream.bytes = 65_536;

    const result = appendStreamChunk(stream, "more data");

    expect(result).toBeUndefined();
    expect(stream.truncated).toBe(true);
    expect(stream.chunks).toHaveLength(0);
  });

  it("handles Buffer input directly", () => {
    const stream = createStreamCollector();
    const result = appendStreamChunk(stream, Buffer.from("buffer-data"));

    expect(result).toBeDefined();
    expect(result?.toString("utf8")).toBe("buffer-data");
    expect(stream.bytes).toBe(11);
  });

  it("handles Uint8Array input", () => {
    const stream = createStreamCollector();
    const input = new Uint8Array(Buffer.from("typed-array"));
    const result = appendStreamChunk(stream, input);

    expect(result).toBeDefined();
    expect(result?.toString("utf8")).toBe("typed-array");
  });

  it("handles numeric input by converting to string", () => {
    const stream = createStreamCollector();
    const result = appendStreamChunk(stream, 42);

    expect(result).toBeDefined();
    expect(result?.toString("utf8")).toBe("42");
  });

  it("accumulates multiple chunks correctly", () => {
    const stream = createStreamCollector();

    appendStreamChunk(stream, "aaa");
    appendStreamChunk(stream, "bbb");
    appendStreamChunk(stream, "ccc");

    expect(stream.chunks).toHaveLength(3);
    expect(stream.bytes).toBe(9);
    expect(Buffer.concat(stream.chunks).toString("utf8")).toBe("aaabbbccc");
    expect(stream.truncated).toBe(false);
  });
});
