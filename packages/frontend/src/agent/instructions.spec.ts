import type { ModelMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import {
  buildAgentInstructions,
  buildRuntimeContextMessage,
  withRuntimeContextMessage,
} from "./instructions";

function createContext(
  overrides?: Partial<{
    mode: "focus" | "wildcard";
    toSkillsPrompt: string;
    toContextPrompt: string;
  }>
) {
  return {
    mode: overrides?.mode ?? "focus",
    toSkillsPrompt: vi.fn(() => overrides?.toSkillsPrompt ?? ""),
    toContextPrompt: vi.fn(() => overrides?.toContextPrompt ?? ""),
  };
}

describe("buildAgentInstructions", () => {
  it("keeps volatile runtime context out of the system prompt", () => {
    const context = createContext({
      toSkillsPrompt: "<additional_instructions>skills</additional_instructions>",
      toContextPrompt: "<context>runtime</context>",
    });

    const result = buildAgentInstructions({
      context: context as never,
      model: { id: "gpt-5.4" } as never,
    });

    expect(result).toContain("<additional_instructions>skills</additional_instructions>");
    expect(result).not.toContain("<context>runtime</context>");
  });
});

describe("buildRuntimeContextMessage", () => {
  it("builds a runtime context message with context and iteration status", () => {
    const context = createContext({ toContextPrompt: "<context>runtime</context>" });

    const result = buildRuntimeContextMessage({
      context: context as never,
      steps: 2,
      maxSteps: 10,
    });

    expect(result).toEqual({
      role: "user",
      content: expect.stringContaining("<runtime_context>"),
    });
    expect((result as ModelMessage).content).toContain("<context>runtime</context>");
  });
});

describe("withRuntimeContextMessage", () => {
  it("replaces an existing runtime context message instead of accumulating it", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "hello" },
      { role: "user", content: "<runtime_context>\nold\n</runtime_context>" },
    ];

    const result = withRuntimeContextMessage(messages, {
      role: "user",
      content: "<runtime_context>\nnew\n</runtime_context>",
    });

    expect(result).toEqual([
      { role: "user", content: "hello" },
      { role: "user", content: "<runtime_context>\nnew\n</runtime_context>" },
    ]);
  });
});
