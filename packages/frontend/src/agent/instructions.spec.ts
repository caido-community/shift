import { describe, expect, it, vi } from "vitest";

import { buildAgentInstructions } from "./instructions";

function createContext(
  overrides?: Partial<{
    mode: "focus" | "wildcard";
    toSkillsPrompt: string;
  }>
) {
  return {
    mode: overrides?.mode ?? "focus",
    toSkillsPrompt: vi.fn(() => overrides?.toSkillsPrompt ?? ""),
  };
}

describe("buildAgentInstructions", () => {
  it("keeps volatile runtime context out of the system prompt", () => {
    const context = createContext({
      toSkillsPrompt: "<additional_instructions>skills</additional_instructions>",
    });

    const result = buildAgentInstructions({
      context: context as never,
      model: { id: "gpt-5.4" } as never,
    });

    expect(result).toContain("<additional_instructions>skills</additional_instructions>");
    expect(result).not.toContain("<context>runtime</context>");
  });

  it("builds a stable instruction prefix across runtime context changes", () => {
    const context = createContext({
      toSkillsPrompt: "<additional_instructions>skills</additional_instructions>",
    });

    const first = buildAgentInstructions({
      context: context as never,
      model: { id: "gpt-5.4" } as never,
    });

    const second = buildAgentInstructions({
      context: context as never,
      model: { id: "gpt-5.4" } as never,
    });

    expect(second).toBe(first);
    expect(second).not.toContain("first runtime");
    expect(second).not.toContain("second runtime");
  });

  it("instructs agents to refresh live context before and during work", () => {
    const result = buildAgentInstructions({
      context: createContext() as never,
      model: { id: "gpt-5.4" } as never,
    });

    expect(result).toContain("Call ContextRead once at the beginning");
    expect(result).toContain("Refresh it from time to time after more intense actions");
  });
});
