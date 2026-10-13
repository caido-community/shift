import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAITraceEnabled, writeAITrace } from "./trace";

const TRACE_PREFIX = "[Shift AI trace] ";
const TRACE_SESSION_STORAGE_KEY = "shift:ai-trace";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("writeAITrace", () => {
  it("does not log when tracing is disabled", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    writeAITrace(false, "run-1", "transport.input", { secret: "value" });

    expect(debug).not.toHaveBeenCalled();
  });

  it("uses an explicit session-scoped toggle", () => {
    expect(isAITraceEnabled()).toBe(false);

    sessionStorage.setItem(TRACE_SESSION_STORAGE_KEY, "1");

    expect(isAITraceEnabled()).toBe(true);
  });

  it("fails closed when session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });

    expect(isAITraceEnabled()).toBe(false);
  });

  it("writes compact records as one exact console argument", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const payload = { provider: "anthropic", model: "claude-opus-5" };

    writeAITrace(true, "run-1", "transport", payload);

    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug.mock.calls[0]).toHaveLength(1);
    const message = String(debug.mock.calls[0]?.[0]);
    expect(message.length).toBeLessThanOrEqual(4_000);
    expect(JSON.parse(message.slice(TRACE_PREFIX.length))).toMatchObject({
      source: "shift",
      runId: "run-1",
      stage: "transport",
      payload,
    });
  });

  it("chunks large records without losing their exact contents", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const payload = { text: `a${"🧪".repeat(1_500)}\\"line\\n` };

    writeAITrace(true, "run-1", "convertToModelMessages.output", payload);

    const messages = debug.mock.calls.map((call) => String(call[0]));
    const chunks = messages.map((message) => JSON.parse(message.slice(TRACE_PREFIX.length)));
    const firstChunkBytes = Uint8Array.from(atob(chunks[0].data), (character) =>
      character.charCodeAt(0)
    );
    const binary = chunks.map((chunk) => atob(chunk.data)).join("");
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const record = JSON.parse(new TextDecoder().decode(bytes));

    expect(messages.length).toBeGreaterThan(1);
    expect(() => new TextDecoder("utf-8", { fatal: true }).decode(firstChunkBytes)).toThrow();
    expect(messages.every((message) => message.length <= 4_000)).toBe(true);
    expect(debug.mock.calls.every((call) => call.length === 1)).toBe(true);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([...chunks.keys()]);
    expect(new Set(chunks.map((chunk) => chunk.chunkCount))).toEqual(new Set([chunks.length]));
    expect(record).toMatchObject({
      source: "shift",
      runId: "run-1",
      stage: "convertToModelMessages.output",
      payload,
    });
  });
});
