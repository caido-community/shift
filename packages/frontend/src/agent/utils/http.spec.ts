import { describe, expect, it } from "vitest";

import { normalizeCRLF, normalizeRawHttpRequest } from "./http";

describe("normalizeCRLF", () => {
  it("normalizes mixed line endings to CRLF", () => {
    expect(normalizeCRLF("a\nb\r\nc\n")).toBe("a\r\nb\r\nc\r\n");
  });
});

describe("normalizeRawHttpRequest", () => {
  it("returns empty string unchanged", () => {
    expect(normalizeRawHttpRequest("")).toBe("");
  });

  it("adds header-body separator when missing", () => {
    const raw = "GET / HTTP/1.1\r\nHost: example.com";
    expect(normalizeRawHttpRequest(raw)).toBe("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
  });

  it("adds exactly one CRLF when request already ends with CRLF", () => {
    const raw = "GET / HTTP/1.1\r\nHost: example.com\r\n";
    expect(normalizeRawHttpRequest(raw)).toBe("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
  });

  it("keeps existing separator when no body is present", () => {
    const raw = "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n";
    expect(normalizeRawHttpRequest(raw)).toBe(raw);
  });

  it("keeps existing separator when body is present", () => {
    const raw = "POST /submit HTTP/1.1\r\nHost: example.com\r\nContent-Length: 4\r\n\r\nping";
    expect(normalizeRawHttpRequest(raw)).toBe(raw);
  });

  it("normalizes LF endings before enforcing separator", () => {
    const raw = "GET / HTTP/1.1\nHost: example.com\n";
    expect(normalizeRawHttpRequest(raw)).toBe("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
  });
});
