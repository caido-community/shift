import { describe, expect, it } from "vitest";

import { BACKGROUND_EXECUTION_NOTE, buildBackgroundPrompt } from "./prompt";

describe("buildBackgroundPrompt", () => {
  it("includes serialized context, learnings, and user content", () => {
    const prompt = buildBackgroundPrompt(
      {
        content: "Trace the login flow",
        context: {
          requestId: {
            description: "Active request",
            value: "req-1",
          },
          responseId: {
            description: "Active response",
            value: "resp-1",
          },
          selectedRequestIds: {
            description: "Selected request ids",
            value: ["req-2"],
          },
        },
      },
      ["check csrf token", "inspect redirects"]
    );

    expect(prompt).toContain("<context>");
    expect(prompt).toContain('"requestId":{"description":"Active request","value":"req-1"}');
    expect(prompt).toContain("<learnings>");
    expect(prompt).toContain("- 0: check csrf token");
    expect(prompt).toContain("- 1: inspect redirects");
    expect(prompt).toContain("<user>");
    expect(prompt).toContain("Trace the login flow");
  });
});

describe("BACKGROUND_EXECUTION_NOTE", () => {
  it("includes background-specific execution guidance", () => {
    expect(BACKGROUND_EXECUTION_NOTE).toContain("<background_execution_note>");
    expect(BACKGROUND_EXECUTION_NOTE).toContain("HistoryRowHighlight");
    expect(BACKGROUND_EXECUTION_NOTE).toContain("historyRequestResponseRead");
  });
});
