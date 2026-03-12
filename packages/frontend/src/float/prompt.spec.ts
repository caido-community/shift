import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "./prompt";

describe("buildSystemPrompt", () => {
  it("removes background agent guidance when disabled", () => {
    const prompt = buildSystemPrompt({
      backgroundAgents: false,
    });

    expect(prompt).not.toContain("<backgroundAgentSpawn>");
    expect(prompt).not.toContain("backgroundAgentSpawn");
  });

  it("includes background agent guidance when enabled", () => {
    const prompt = buildSystemPrompt({
      backgroundAgents: true,
    });

    expect(prompt).toContain("<backgroundAgentSpawn>");
    expect(prompt).toContain("backgroundAgentSpawn");
  });
});
