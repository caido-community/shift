import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const NavigateReplayEntrySchema = z.object({
  entryIndex: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "The Entry ID of the replay entry to activate within the session.",
    ),
  sessionId: z
    .string()
    .optional()
    .describe(
      "Replay session ID to update. Defaults to the currently active replay session.",
    ),
});

const navigateReplayEntryTool = tool({
  description: `Set the active entry in a Caido replay session.
Use this after listing entries with fetchReplayEntries to focus the replay tab on a specific request/response pair.`,
  inputSchema: NavigateReplayEntrySchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    const sessionId = input.sessionId ?? context.replaySession.id;
    const entryId = String(input.entryIndex);

    try {
      await context.sdk.graphql.setActiveReplaySessionEntry({
        id: sessionId,
        entryId,
      });

      context.replaySession.activeEntryId = entryId;

      return {
        success: true,
        sessionId,
        entryIndex: input.entryIndex,
        message: `Activated replay entry ${entryId} for session ${sessionId}.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        sessionId,
        entryIndex: input.entryIndex,
        error: `Failed to activate replay entry: ${message}`,
      };
    }
  },
});
