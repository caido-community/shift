import { describe, expect, it } from "vitest";

import { AGENT_INSTRUCTIONS_CHARS, buildSkillsPrompt, SKILL_CONTENT_CHARS } from "./context.prompt";

describe("buildSkillsPrompt - leak prevention", () => {
  it("truncates long agent instructions and adds truncation marker", () => {
    const longInstructions = "a".repeat(AGENT_INSTRUCTIONS_CHARS + 500);
    const result = buildSkillsPrompt({ agentInstructions: longInstructions });

    expect(result).toContain("[...truncated.");
    expect(result).not.toContain(longInstructions);
  });

  it("truncates long skill content and adds truncation marker", () => {
    const longContent = "s".repeat(SKILL_CONTENT_CHARS + 300);
    const result = buildSkillsPrompt({
      skills: [{ kind: "always-attached", id: "skill-1", title: "My Skill", content: longContent }],
    });

    expect(result).toContain("[...truncated.");
    expect(result).toContain("ReadSkill");
    expect(result).not.toContain(longContent);
  });
});

describe("buildSkillsPrompt - full coverage", () => {
  it("includes agent_instructions when provided", () => {
    const result = buildSkillsPrompt({ agentInstructions: "Be helpful." });
    expect(result).toContain("<agent_instructions>");
    expect(result).toContain("</agent_instructions>");
    expect(result).toContain("Be helpful.");
  });

  it("includes always-attached skills with full content", () => {
    const result = buildSkillsPrompt({
      skills: [
        {
          kind: "always-attached",
          id: "skill-xss",
          title: "XSS Guide",
          content: "Watch for reflected input.",
        },
      ],
    });
    expect(result).toContain('<skill id="skill-xss" title="XSS Guide">');
    expect(result).toContain("Watch for reflected input.");
  });

  it("includes on-demand skills as catalog with ReadSkill guidance", () => {
    const result = buildSkillsPrompt({
      skills: [
        {
          kind: "on-demand",
          id: "skill-sqli",
          title: "SQL Injection",
          description: "Use when testing database inputs",
        },
      ],
    });
    expect(result).toContain("<skills_available_on_demand>");
    expect(result).toContain("skill-sqli");
    expect(result).toContain("SQL Injection");
    expect(result).toContain("Use when testing database inputs");
    expect(result).toContain("ReadSkill");
  });

  it("includes on-demand skill without description", () => {
    const result = buildSkillsPrompt({
      skills: [{ kind: "on-demand", id: "skill-1", title: "Generic" }],
    });
    expect(result).toContain("- Generic (id: skill-1)");
  });

  it("wraps output in additional_instructions tags", () => {
    const result = buildSkillsPrompt({ agentInstructions: "Hi" });
    expect(result).toMatch(/^<additional_instructions>\n/);
    expect(result).toMatch(/\n<\/additional_instructions>$/);
  });

  it("returns empty string when snapshot has no agent instructions or skills", () => {
    expect(buildSkillsPrompt({})).toBe("");
  });
});
