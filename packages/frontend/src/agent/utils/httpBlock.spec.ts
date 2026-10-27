import { describe, expect, it } from "vitest";

import { toHttpBlockLines } from "./httpBlock";

const text = (line: { text: string }[]) => line.map((segment) => segment.text).join("");
const marked = (line: { text: string; marked: boolean }[]) =>
  line.filter((segment) => segment.marked).map((segment) => segment.text);

describe("toHttpBlockLines", () => {
  it("strips the markers and marks what they wrapped", () => {
    const lines = toHttpBlockLines(
      "GET /?[HIGHLIGHT]test=123[/HIGHLIGHT] HTTP/1.1\nHost: example.com\n\na=1"
    );

    expect(lines.map(text)).toEqual(["GET /?test=123 HTTP/1.1", "Host: example.com", "", "a=1"]);
    expect(lines.map(marked)).toEqual([["test=123"], [], [], []]);
    expect(lines[0]).toEqual([
      { text: "GET", color: "#d2a8ff", marked: false },
      { text: " /?", color: undefined, marked: false },
      { text: "test=123", color: undefined, marked: true },
      { text: " ", color: undefined, marked: false },
      { text: "HTTP/1.1", color: "#48b685", marked: false },
    ]);
    expect(lines[1]?.[0]).toEqual({ text: "Host", color: "#fec418", marked: false });
    expect(lines[3]).toEqual([{ text: "a=1", color: undefined, marked: false }]);
  });

  it("carries a highlight across lines and colors a response status line", () => {
    const lines = toHttpBlockLines("HTTP/1.1 200 OK\n[HIGHLIGHT]X-A: 1\nX-B[/HIGHLIGHT]: 2");

    expect(lines[0]?.slice(0, 3)).toEqual([
      { text: "HTTP/1.1", color: "#48b685", marked: false },
      { text: " ", color: undefined, marked: false },
      { text: "200", color: "#b5cea8", marked: false },
    ]);
    expect(lines.map(marked)).toEqual([[], ["X-A", ": 1"], ["X-B"]]);
  });
});
