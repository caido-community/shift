import { tool } from "ai";
import { z } from "zod";

import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  newName: z.string().describe("New name for the replay tab (non-empty)"),
  sessionId: z
    .string()
    .nullable()
    .describe(
      'Session ID of the replay tab to rename. Use null for the current tab. If users says, rename "this tab", then most likely he refers to the current tab.',
    ),
});

export const renameReplayTabTool = tool({
  description: "Rename a replay session tab",
  inputSchema: InputSchema,
  execute: async ({ newName, sessionId }, { experimental_context }) => {
    const { sdk, context } = experimental_context as FloatToolContext;
    const contextSessionId = (context.replay?.value as { sessionId?: string })
      ?.sessionId;

    const targetSessionId = sessionId ?? contextSessionId;
    if (targetSessionId === undefined) {
      return {
        success: false,
        error: "No session ID provided or the current tab is not a replay tab",
      };
    }

    await sdk.replay.renameSession(targetSessionId, newName);

    return {
      success: true,
      frontend_message: "Replay tab renamed successfully",
    };
  },
});
