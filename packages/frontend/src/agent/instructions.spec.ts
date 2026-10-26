import { describe, expect, it } from "vitest";

import { buildAgentInstructions } from "./instructions";

const SKILLS_PROMPT = "<additional_instructions>skills</additional_instructions>";

describe("buildAgentInstructions", () => {
  it("appends the skills prompt", () => {
    const result = buildAgentInstructions({
      mode: "focus",
      skillsPrompt: SKILLS_PROMPT,
    });

    expect(result).toContain(SKILLS_PROMPT);
  });
});
