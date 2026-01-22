import { describe, expect, it } from "vitest";

import { validateSkillUrl } from "./validation";

describe("validateSkillUrl", () => {
  it("accepts valid gist.githubusercontent.com URL", () => {
    const result = validateSkillUrl("https://gist.githubusercontent.com/user/abc123/raw/file.txt");
    expect(result).toEqual({ valid: true });
  });

  it("accepts valid raw.githubusercontent.com URL", () => {
    const result = validateSkillUrl("https://raw.githubusercontent.com/user/repo/main/file.md");
    expect(result).toEqual({ valid: true });
  });

  it("accepts valid gist.github.com URL", () => {
    const result = validateSkillUrl("https://gist.github.com/user/abc123");
    expect(result).toEqual({ valid: true });
  });

  it("rejects invalid URL format", () => {
    const result = validateSkillUrl("not-a-valid-url");
    expect(result).toEqual({ valid: false, error: "Invalid URL format" });
  });

  it("rejects URL with HTTP protocol", () => {
    const result = validateSkillUrl("http://gist.githubusercontent.com/user/abc123");
    expect(result).toEqual({
      valid: false,
      error: "URL must use HTTPS protocol",
    });
  });

  it("rejects URL with disallowed hostname", () => {
    const result = validateSkillUrl("https://example.com/some/path");
    expect(result).toEqual({
      valid: false,
      error:
        "URL hostname must be one of: gist.githubusercontent.com, raw.githubusercontent.com, gist.github.com",
    });
  });

  it("rejects URL with subdomain of allowed host", () => {
    const result = validateSkillUrl("https://evil.raw.githubusercontent.com/user/repo");
    expect(result).toEqual({
      valid: false,
      error:
        "URL hostname must be one of: gist.githubusercontent.com, raw.githubusercontent.com, gist.github.com",
    });
  });

  it("rejects empty string", () => {
    const result = validateSkillUrl("");
    expect(result).toEqual({ valid: false, error: "Invalid URL format" });
  });
});
