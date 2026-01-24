import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils/optional";

const inputSchema = z.object({
  entryId: z
    .string()
    .describe(
      "The ID of the replay entry to navigate to. Use the entry IDs provided in the context."
    ),
});

const valueSchema = z.object({
  entryId: z.string(),
  requestId: z.string().optional(),
});

const outputSchema = ToolResult.schema(valueSchema);

type ReplayEntryNavigateInput = z.infer<typeof inputSchema>;
type ReplayEntryNavigateValue = z.infer<typeof valueSchema>;
type ReplayEntryNavigateOutput = ToolResultType<ReplayEntryNavigateValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Navigating to entry " },
    { text: input?.entryId ?? "entry", muted: true },
  ],
  success: ({ output }) =>
    output
      ? [{ text: "Navigated to entry " }, { text: output.entryId, muted: true }]
      : [{ text: "Navigated to entry", muted: true }],
  error: () => "Failed to navigate to entry",
} satisfies ToolDisplay<ReplayEntryNavigateInput, ReplayEntryNavigateValue>;

export const ReplayEntryNavigate = tool({
  description:
    "Navigate to a different replay entry within the current session's history. Each time you send a request, a new entry is created in the session. Use this to go back to a previous request/response pair - for example, to re-examine an earlier response, compare results, or restart from a known good state. The entryId must belong to the current session (entry IDs from other sessions will be rejected). After navigation, the request editor will show the selected entry's request, and the agent context will be updated accordingly. Returns the entry ID and associated request ID.",
  inputSchema,
  outputSchema,
  execute: async ({ entryId }, { experimental_context }): Promise<ReplayEntryNavigateOutput> => {
    const context = experimental_context as AgentContext;
    const sdk = context.sdk;

    const entry = sdk.replay.getEntry(entryId);
    if (!isPresent(entry)) {
      return ToolResult.err("Entry not found");
    }

    if (entry.sessionId !== context.sessionId) {
      return ToolResult.err("Entry does not belong to the current session");
    }

    await sdk.replay.showEntry(context.sessionId, entryId, {
      overwriteDraft: true,
    });

    const entryResult = await sdk.graphql.replayEntry({
      id: entryId,
    });
    const replayEntry = entryResult.replayEntry;

    if (isPresent(replayEntry)) {
      context.setHttpRequest(replayEntry.raw);
    }

    return ToolResult.ok({
      message: `Navigated to entry ${entryId}`,
      entryId,
      requestId: entry.requestId,
    });
  },
});
