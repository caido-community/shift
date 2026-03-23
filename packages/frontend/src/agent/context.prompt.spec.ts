import { describe, expect, it } from "vitest";

import {
  AGENT_INSTRUCTIONS_CHARS,
  BINARY_INSTRUCTIONS_CHARS,
  buildContextPrompt,
  buildSkillsPrompt,
  ENVIRONMENT_NAME_CHARS,
  ENVIRONMENT_VARIABLES_CONTEXT_CHARS,
  HTTP_REQUEST_CONTEXT_CHARS,
  LEARNING_VALUE_CHARS,
  LEARNINGS_TOTAL_CHARS,
  SKILL_CONTENT_CHARS,
  TODO_CONTENT_CHARS,
  WORKFLOW_DESCRIPTION_CHARS,
  WORKFLOW_NAME_CHARS,
} from "./context.prompt";

describe("buildContextPrompt - leak prevention", () => {
  it("truncates long todo content and adds truncation marker", () => {
    const longContent = "x".repeat(TODO_CONTENT_CHARS + 500);
    const result = buildContextPrompt({
      todos: [{ id: 1, content: longContent, status: "pending" }],
    });

    expect(result).toContain("[...truncated.");
    expect(result).not.toContain(longContent);
    expect(result.length).toBeLessThan(longContent.length + 500);
  });

  it("truncates long learning previews and adds retrieval guidance", () => {
    const longLearning = "y".repeat(LEARNING_VALUE_CHARS + 300);
    const result = buildContextPrompt({
      learnings: [{ index: 0, preview: longLearning, length: longLearning.length }],
    });

    expect(result).toContain("[...truncated.");
    expect(result).toContain("LearningRead");
    expect(result).not.toContain(longLearning);
  });

  it("truncates long learnings block when total exceeds limit", () => {
    const learning = "z".repeat(500);
    const manyLearnings = Array.from({ length: 50 }, (_, i) => ({
      index: i,
      preview: `${learning}-${i}`,
      length: learning.length + `${i}`.length + 1,
    }));
    const result = buildContextPrompt({ learnings: manyLearnings });

    expect(result).toContain("[...truncated.");
    const fullSerialized = JSON.stringify(manyLearnings, null, 2);
    expect(result).not.toContain(fullSerialized);
    expect(result.length).toBeLessThan(LEARNINGS_TOTAL_CHARS + 500);
  });

  it("truncates long HTTP request and adds truncation marker", () => {
    const longRequest = "GET / HTTP/1.1\r\n" + "a".repeat(HTTP_REQUEST_CONTEXT_CHARS + 1000);
    const result = buildContextPrompt({ httpRequest: longRequest });

    expect(result).toContain("[...truncated.");
    expect(result).toContain("RequestRangeRead");
    expect(result).not.toContain(longRequest);
  });

  it("truncates long environment variable previews", () => {
    const longValue = "v".repeat(ENVIRONMENT_VARIABLES_CONTEXT_CHARS + 500);
    const result = buildContextPrompt({
      environmentVariables: [
        { name: "key", kind: "PLAIN", preview: longValue, valueLength: longValue.length },
      ],
    });

    expect(result).toContain("[...truncated.");
    expect(result).toContain("EnvironmentRead");
    expect(result).not.toContain(longValue);
  });

  it("truncates long workflow name and description", () => {
    const longName = "n".repeat(WORKFLOW_NAME_CHARS + 100);
    const longDesc = "d".repeat(WORKFLOW_DESCRIPTION_CHARS + 200);
    const result = buildContextPrompt({
      allowedConvertWorkflows: [{ id: "w1", name: longName, description: longDesc }],
    });

    expect(result).toContain("[...truncated.");
    expect(result).not.toContain(longName);
    expect(result).not.toContain(longDesc);
  });

  it("truncates long binary instructions", () => {
    const longInstructions = "i".repeat(BINARY_INSTRUCTIONS_CHARS + 300);
    const result = buildContextPrompt({
      allowedBinaries: [{ path: "/usr/bin/ffuf", instructions: longInstructions }],
    });

    expect(result).toContain("[...truncated.");
    expect(result).not.toContain(longInstructions);
  });

  it("truncates long environment names", () => {
    const longName = "e".repeat(ENVIRONMENT_NAME_CHARS + 50);
    const result = buildContextPrompt({
      environmentsContext: {
        all: [{ id: "env1", name: longName }],
        selectedId: "env1",
        selectedName: longName,
      },
    });

    expect(result).toContain("[...truncated.");
    expect(result).not.toContain(longName);
  });
});

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

describe("buildContextPrompt - full coverage", () => {
  it("includes todos section when provided", () => {
    const result = buildContextPrompt({
      todos: [{ id: 1, content: "Do something", status: "in_progress" }],
    });
    expect(result).toContain("<todos>");
    expect(result).toContain("</todos>");
    expect(result).toContain("Do something");
    expect(result).toContain("id: 1");
    expect(result).toContain("[in_progress]");
  });

  it("includes learnings section when provided", () => {
    const result = buildContextPrompt({
      learnings: [
        { index: 0, preview: "learning one", length: "learning one".length },
        { index: 1, preview: "learning two", length: "learning two".length },
      ],
    });
    expect(result).toContain("<learnings>");
    expect(result).toContain("</learnings>");
    expect(result).toContain("learning one");
    expect(result).toContain("learning two");
  });

  it("includes current_http_request section when provided", () => {
    const request = "GET /api HTTP/1.1\r\nHost: example.com";
    const result = buildContextPrompt({ httpRequest: request });
    expect(result).toContain("<current_http_request>");
    expect(result).toContain("</current_http_request>");
    expect(result).toContain(request);
  });

  it("includes allowed_convert_workflows section when provided", () => {
    const result = buildContextPrompt({
      allowedConvertWorkflows: [
        { id: "w1", name: "Base64", description: "Encodes/decodes base64" },
      ],
    });
    expect(result).toContain("<allowed_convert_workflows>");
    expect(result).toContain("</allowed_convert_workflows>");
    expect(result).toContain("Base64");
  });

  it("includes allowed_binaries section when provided (even empty)", () => {
    const result = buildContextPrompt({ allowedBinaries: [] });
    expect(result).toContain("<allowed_binaries>");
    expect(result).toContain("</allowed_binaries>");
  });

  it("includes replay_entries section when provided", () => {
    const result = buildContextPrompt({
      entriesContext: {
        activeEntryId: "entry-2",
        recentEntryIds: ["entry-1", "entry-2"],
      },
    });
    expect(result).toContain("<replay_entries>");
    expect(result).toContain("</replay_entries>");
    expect(result).toContain("entry-1, entry-2");
    expect(result).toContain("Active entry: entry-2");
  });

  it("includes environments section when provided", () => {
    const result = buildContextPrompt({
      environmentsContext: {
        all: [{ id: "e1", name: "Production" }],
        selectedId: "e1",
        selectedName: "Production",
      },
    });
    expect(result).toContain("<environments>");
    expect(result).toContain("</environments>");
    expect(result).toContain("Production");
  });

  it("includes environment_variables section when provided", () => {
    const result = buildContextPrompt({
      environmentVariables: [{ name: "API_KEY", kind: "PLAIN", preview: "secret", valueLength: 6 }],
    });
    expect(result).toContain("<environment_variables>");
    expect(result).toContain("</environment_variables>");
    expect(result).toContain("API_KEY");
  });

  it("wraps output in context tags when any section exists", () => {
    const result = buildContextPrompt({ httpRequest: "GET / HTTP/1.1" });
    expect(result).toMatch(/^<context>\n/);
    expect(result).toMatch(/\n<\/context>$/);
  });

  it("includes empty todos section when snapshot has no other sections", () => {
    expect(buildContextPrompt({})).toBe(
      "<context>\n<todos>\nThere's no todos yet.\n</todos>\n</context>"
    );
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
