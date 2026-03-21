import { describe, expect, it } from "vitest";

import {
  buildContextPrompt,
  buildSkillsPrompt,
  ENVIRONMENT_VARIABLES_CONTEXT_CHARS,
  LEARNING_VALUE_CHARS,
  LEARNINGS_TOTAL_CHARS,
  TODO_CONTENT_CHARS,
  HTTP_REQUEST_CONTEXT_CHARS,
  SKILL_CONTENT_CHARS,
  AGENT_INSTRUCTIONS_CHARS,
  WORKFLOW_NAME_CHARS,
  WORKFLOW_DESCRIPTION_CHARS,
  BINARY_INSTRUCTIONS_CHARS,
  ENVIRONMENT_NAME_CHARS,
} from "./context.prompt";

describe("buildContextPrompt - leak prevention", () => {
  it("truncates long todo content and adds truncation marker", () => {
    const longContent = "x".repeat(TODO_CONTENT_CHARS + 500);
    const result = buildContextPrompt({
      todos: [{ id: "t1", content: longContent, completed: false }],
    });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longContent);
    expect(result.length).toBeLessThan(longContent.length + 500);
  });

  it("truncates long learning values and adds truncation marker", () => {
    const longLearning = "y".repeat(LEARNING_VALUE_CHARS + 300);
    const result = buildContextPrompt({
      learnings: [longLearning],
    });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longLearning);
  });

  it("truncates long learnings block when total exceeds limit", () => {
    const learning = "z".repeat(500);
    const manyLearnings = Array.from({ length: 50 }, (_, i) => `${learning}-${i}`);
    const result = buildContextPrompt({ learnings: manyLearnings });

    expect(result).toContain("...[truncated]...");
    const fullSerialized = JSON.stringify(
      manyLearnings.map((v, i) => ({ index: i, value: v })),
      null,
      2
    );
    expect(result).not.toContain(fullSerialized);
    expect(result.length).toBeLessThan(LEARNINGS_TOTAL_CHARS + 500);
  });

  it("truncates long HTTP request and adds truncation marker", () => {
    const longRequest = "GET / HTTP/1.1\r\n" + "a".repeat(HTTP_REQUEST_CONTEXT_CHARS + 1000);
    const result = buildContextPrompt({ httpRequest: longRequest });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longRequest);
  });

  it("truncates long environment variables JSON", () => {
    const longValue = "v".repeat(ENVIRONMENT_VARIABLES_CONTEXT_CHARS + 500);
    const envJson = JSON.stringify([{ name: "key", value: longValue }], null, 2);
    const result = buildContextPrompt({ environmentVariablesJson: envJson });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longValue);
  });

  it("truncates long workflow name and description", () => {
    const longName = "n".repeat(WORKFLOW_NAME_CHARS + 100);
    const longDesc = "d".repeat(WORKFLOW_DESCRIPTION_CHARS + 200);
    const result = buildContextPrompt({
      allowedConvertWorkflows: [{ id: "w1", name: longName, description: longDesc }],
    });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longName);
    expect(result).not.toContain(longDesc);
  });

  it("truncates long binary instructions", () => {
    const longInstructions = "i".repeat(BINARY_INSTRUCTIONS_CHARS + 300);
    const result = buildContextPrompt({
      allowedBinaries: [{ path: "/usr/bin/ffuf", instructions: longInstructions }],
    });

    expect(result).toContain("...[truncated]...");
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

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longName);
  });
});

describe("buildSkillsPrompt - leak prevention", () => {
  it("truncates long agent instructions and adds truncation marker", () => {
    const longInstructions = "a".repeat(AGENT_INSTRUCTIONS_CHARS + 500);
    const result = buildSkillsPrompt({ agentInstructions: longInstructions });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longInstructions);
  });

  it("truncates long skill content and adds truncation marker", () => {
    const longContent = "s".repeat(SKILL_CONTENT_CHARS + 300);
    const result = buildSkillsPrompt({
      skills: [{ title: "My Skill", content: longContent }],
    });

    expect(result).toContain("...[truncated]...");
    expect(result).not.toContain(longContent);
  });
});

describe("buildContextPrompt - full coverage", () => {
  it("includes todos section when provided", () => {
    const result = buildContextPrompt({
      todos: [{ id: "t1", content: "Do something", completed: false }],
    });
    expect(result).toContain("<todos>");
    expect(result).toContain("</todos>");
    expect(result).toContain("Do something");
    expect(result).toContain("id: t1");
  });

  it("includes payload_blobs section when provided", () => {
    const result = buildContextPrompt({
      payloadBlobs: [
        { blobId: "blob-1", reason: "test", length: 10, preview: "hello..." },
      ],
    });
    expect(result).toContain("<payload_blobs>");
    expect(result).toContain("</payload_blobs>");
    expect(result).toContain("blob-1");
  });

  it("includes learnings section when provided", () => {
    const result = buildContextPrompt({
      learnings: ["learning one", "learning two"],
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
    const envJson = JSON.stringify([{ name: "API_KEY", value: "secret" }], null, 2);
    const result = buildContextPrompt({ environmentVariablesJson: envJson });
    expect(result).toContain("<environment_variables>");
    expect(result).toContain("</environment_variables>");
  });

  it("wraps output in context tags when any section exists", () => {
    const result = buildContextPrompt({ httpRequest: "GET / HTTP/1.1" });
    expect(result).toMatch(/^<context>\n/);
    expect(result).toMatch(/\n<\/context>$/);
  });

  it("returns empty string when snapshot has no sections", () => {
    expect(buildContextPrompt({})).toBe("");
  });
});

describe("buildSkillsPrompt - full coverage", () => {
  it("includes agent_instructions when provided", () => {
    const result = buildSkillsPrompt({ agentInstructions: "Be helpful." });
    expect(result).toContain("<agent_instructions>");
    expect(result).toContain("</agent_instructions>");
    expect(result).toContain("Be helpful.");
  });

  it("includes skills when provided", () => {
    const result = buildSkillsPrompt({
      skills: [{ title: "XSS Guide", content: "Watch for reflected input." }],
    });
    expect(result).toContain("<skill title=\"XSS Guide\">");
    expect(result).toContain("Watch for reflected input.");
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
