import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { resolveToolInputPlaceholders } from "@/agent/tools/utils/placeholders";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { getActiveEntryRequest } from "@/utils/caido";

const inputSchema = z.object({
  title: z.string().describe("A concise title describing the confirmed vulnerability."),
  markdown: z
    .string()
    .describe(
      "Evidence, reproduction steps, demonstrated impact, and any unverified prerequisites."
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
    "Document a confirmed vulnerability in Caido's Findings panel. Read builtin:findings for reporting guidance. The finding links to the current replay entry; keep that entry unchanged until this call completes. Title and markdown support §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§ placeholders. Returns the finding ID.",
  inputSchema,
  outputSchema,
  execute: async ({ title, markdown }, { experimental_context }): Promise<FindingsCreateOutput> => {
    const context = experimental_context as AgentContext;
    const sdk = context.sdk;

    const resolvedTitleResult = await resolveToolInputPlaceholders(context, title);
    if (resolvedTitleResult.kind === "Error") {
      return ToolResult.err("Failed to resolve placeholders", resolvedTitleResult.error);
    }
    const resolvedMarkdownResult = await resolveToolInputPlaceholders(context, markdown);
    if (resolvedMarkdownResult.kind === "Error") {
      return ToolResult.err("Failed to resolve placeholders", resolvedMarkdownResult.error);
    }
    const resolvedTitle = resolvedTitleResult.value;
    const resolvedMarkdown = resolvedMarkdownResult.value;

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

    const requestId = getActiveEntryRequest(activeEntry)?.id;
    if (requestId === undefined || requestId === "") {
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
