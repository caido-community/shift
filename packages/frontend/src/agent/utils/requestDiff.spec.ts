import { describe, expect, it } from "vitest";

import { computeRequestDiff } from "./requestDiff";

const request = (headers: string[], body: string) =>
  ["POST /profile HTTP/1.1", ...headers, "", body].join("\r\n");

describe("computeRequestDiff", () => {
  it("returns nothing when no line changed", () => {
    const raw = request(["Host: a.test"], "{}");
    expect(computeRequestDiff(raw, raw.replaceAll("\r\n", "\n"))).toBeUndefined();
  });

  it("reports a replaced header and a changed body with their line numbers", () => {
    const before = request(["Host: a.test", "X-Version: 1"], "a=1");
    const after = request(["Host: a.test", "X-Version: 2", "X-Id: 7"], "a=2");

    expect(computeRequestDiff(before, after)).toEqual({
      omittedLines: 0,
      lines: [
        {
          op: "del",
          line: 3,
          text: "X-Version: 1",
          head: true,
          changedRange: { from: 11, to: 12 },
        },
        {
          op: "add",
          line: 3,
          text: "X-Version: 2",
          head: true,
          changedRange: { from: 11, to: 12 },
        },
        { op: "add", line: 4, text: "X-Id: 7", head: true },
        { op: "del", line: 5, text: "a=1", head: false, changedRange: { from: 2, to: 3 } },
        { op: "add", line: 6, text: "a=2", head: false, changedRange: { from: 2, to: 3 } },
      ],
    });
  });

  it("does not treat lines changed in different places as a replacement", () => {
    const before = request(["X-Remove: 1", "Host: a.test"], "");
    const after = request(["Host: a.test", "X-Add: 1"], "");

    expect(computeRequestDiff(before, after)?.lines).toEqual([
      { op: "del", line: 2, text: "X-Remove: 1", head: true },
      { op: "add", line: 3, text: "X-Add: 1", head: true },
    ]);
  });

  it("caps stored lines and line length", () => {
    const body = Array.from({ length: 50 }, (_, index) => `line ${index}`).join("\n");
    const diff = computeRequestDiff(request([], "x".repeat(1000)), request([], body));

    expect(diff?.lines).toHaveLength(30);
    expect(diff?.omittedLines).toBe(21);
    expect(diff?.lines[0]?.text).toHaveLength(301);
  });

  it("reports every line of an edit too large to align", () => {
    const body = (prefix: string) =>
      Array.from({ length: 250 }, (_, index) => `${prefix}${index}`).join("\n");
    const diff = computeRequestDiff(request([], body("a")), request([], body("b")));

    expect(diff?.lines.every((line) => line.op === "del")).toBe(true);
    expect(diff?.omittedLines).toBe(470);
  });
});
