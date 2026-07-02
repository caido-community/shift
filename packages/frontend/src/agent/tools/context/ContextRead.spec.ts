import { describe, expect, it } from "vitest";

import type { ContextPromptSnapshot } from "@/agent/context.prompt";

import { buildContextReadValue, summarizeCurrentRequest } from "./ContextRead";

describe("summarizeCurrentRequest", () => {
  it("returns metadata without raw request content", () => {
    const rawRequest =
      "POST /api/users?debug=true HTTP/1.1\r\nHost: example.com\r\nX-Test: value\r\n\r\nsecret-body-value";

    const result = summarizeCurrentRequest(rawRequest);

    expect(result).toEqual({
      loaded: true,
      length: rawRequest.length,
      method: "POST",
      target: "/api/users?debug=true",
      protocol: "HTTP/1.1",
      headerCount: 2,
      bodyLength: "secret-body-value".length,
      retrievalHint:
        "Use RequestRangeRead with offset and limit to inspect exact current request text.",
    });
    expect(JSON.stringify(result)).not.toContain("secret-body-value");
  });

  it("handles missing request state", () => {
    expect(summarizeCurrentRequest("")).toEqual({
      loaded: false,
      length: 0,
    });
  });
});

describe("buildContextReadValue", () => {
  it("builds compact live context with retrieval hints", () => {
    const snapshot: ContextPromptSnapshot = {
      todos: [{ id: 1, content: "Check auth bypass", status: "in_progress" }],
      httpRequest: "GET /account HTTP/1.1\r\nHost: example.com\r\n\r\n",
      entriesContext: {
        activeEntryId: "entry-2",
        recentEntryIds: ["entry-1", "entry-2"],
      },
      learnings: [{ index: 0, preview: "Session cookie is auth", length: 22 }],
      environmentsContext: {
        all: [{ id: "env-1", name: "Production" }],
        selectedId: "env-1",
        selectedName: "Production",
      },
      environmentVariables: [
        { name: "SESSION", kind: "SECRET", valueLength: 32 },
        { name: "HOST", kind: "PLAIN", preview: "example.com", valueLength: 11 },
      ],
      allowedBinaries: [{ path: "/usr/bin/ffuf", instructions: "Use -w for wordlists." }],
    };

    const result = buildContextReadValue(snapshot, {
      allowedConvertWorkflows: [
        { id: "workflow-1", name: "URL encode", description: "Encode a string for URLs" },
      ],
      workflowsRestricted: true,
    });

    expect(result.todos).toHaveLength(1);
    expect(result.request.loaded).toBe(true);
    expect(result.request.retrievalHint).toContain("RequestRangeRead");
    expect(result.replayEntries.activeEntryId).toBe("entry-2");
    expect(result.learnings.retrievalHint).toContain("LearningRead");
    expect(result.environments.selectedName).toBe("Production");
    expect(result.environments.retrievalHint).toContain("EnvironmentRead");
    expect(result.allowedConvertWorkflows.restricted).toBe(true);
    expect(result.allowedConvertWorkflows.workflows[0]?.id).toBe("workflow-1");
    expect(result.allowedBinaries.binaries[0]?.path).toBe("/usr/bin/ffuf");
    expect(result.retrievalHints.join("\n")).toContain("ContextRead");
    expect(result.retrievalHints.join("\n")).toContain("ResponseSearch");
  });

  it("does not leak secret environment values or full raw request bodies", () => {
    const snapshot: ContextPromptSnapshot = {
      httpRequest:
        "POST /login HTTP/1.1\r\nHost: example.com\r\nContent-Length: 26\r\n\r\npassword=super-secret-value",
      environmentVariables: [
        {
          name: "API_TOKEN",
          kind: "SECRET",
          valueLength: "super-secret-token".length,
        },
        {
          name: "BASE_URL",
          kind: "PLAIN",
          preview: "https://example.com",
          valueLength: "https://example.com".length,
        },
      ],
    };

    const result = buildContextReadValue(snapshot);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("super-secret-token");
    expect(result.environments.variables.find((v) => v.name === "API_TOKEN")?.preview).toBe(
      undefined
    );
    expect(result.environments.variables.find((v) => v.name === "BASE_URL")?.preview).toBe(
      "https://example.com"
    );
  });
});
