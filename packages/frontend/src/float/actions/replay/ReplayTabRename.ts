import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  newName: z.string().describe("New name for the replay tab (non-empty)"),
  sessionId: z
    .string()
    .nullable()
    .describe(
      'Session ID of the replay tab to rename. Use null for the current tab. If users says, rename "this tab", then most likely he refers to the current tab.'
    ),
});

export const replayTabRenameTool = tool({
  description: "Rename a replay session tab",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ newName, sessionId }, { experimental_context }) => {
    const { sdk, context } = experimental_context as FloatToolContext;
    const contextSessionId = (context.replay?.value as { id?: string })?.id;

    const targetSessionId = sessionId ?? contextSessionId;
    if (targetSessionId === undefined) {
      return ToolResult.err("No session ID provided or the current tab is not a replay tab");
    }

    await sdk.replay.renameSession(targetSessionId, newName);

    return ToolResult.ok({ message: "Replay tab renamed successfully" });
  },
});
