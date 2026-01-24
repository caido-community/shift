import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { resolveEnvironmentVariables } from "@/agent/utils/environment";

const inputSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the finding. This should be a short and concise title that captures the discovered vulnerability or interesting behavior."
    ),
  markdown: z
    .string()
    .describe(
      "The markdown description of the finding. This should provide details about the vulnerability or interesting behavior discovered."
    ),
});

const valueSchema = z.object({
  findingId: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type FindingsCreateInput = z.infer<typeof inputSchema>;
type FindingsCreateValue = z.infer<typeof valueSchema>;
type FindingsCreateOutput = ToolResultType<FindingsCreateValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Creating finding: " },
    { text: input?.title ?? "finding", muted: true },
  ],
  success: ({ input, output }) =>
    output
      ? [{ text: "Created finding: " }, { text: input?.title ?? "finding", muted: true }]
      : [{ text: "Created finding", muted: true }],
  error: () => "Failed to create finding",
} satisfies ToolDisplay<FindingsCreateInput, FindingsCreateValue>;

export const FindingsCreate = tool({
  description:
    "Create a security finding to document a discovered vulnerability, interesting behavior, or notable observation. Findings are linked to the current request in the replay session and appear in Caido's Findings panel for the user to review. Use this when you discover something the user should know about - SQL injection, XSS, authentication bypass, information disclosure, or any security-relevant behavior. The title should be concise (e.g., 'Reflected XSS in search parameter'). The markdown description should include details about the vulnerability, how to reproduce it, and potential impact. Both title and markdown support environment variable substitution using {{VAR_NAME}} syntax. Returns the created finding's ID.",
  inputSchema,
  outputSchema,
  execute: async ({ title, markdown }, { experimental_context }): Promise<FindingsCreateOutput> => {
    const context = experimental_context as AgentContext;
    const sdk = context.sdk;

    const resolvedTitle = await resolveEnvironmentVariables(sdk, title);
    const resolvedMarkdown = await resolveEnvironmentVariables(sdk, markdown);

    const sessionResult = await sdk.graphql.replaySessionEntries({
      id: context.sessionId,
    });

    if (!sessionResult.replaySession) {
      return ToolResult.err("Failed to fetch replay session entries");
    }

    const activeEntry = sessionResult.replaySession.activeEntry;
    if (!activeEntry) {
      return ToolResult.err("No active entry found in replay session");
    }

    const requestId = activeEntry.request?.id;
    if (requestId === undefined || requestId === null || requestId === "") {
      return ToolResult.err("Request ID not found in active entry");
    }

    const finding = await sdk.findings.createFinding(requestId, {
      title: resolvedTitle,
      description: resolvedMarkdown,
      reporter: "Shift Agent",
    });

    if (finding === undefined) {
      return ToolResult.err("Failed to create finding");
    }

    return ToolResult.ok({
      message: "Finding added",
      findingId: finding.id,
    });
  },
});
