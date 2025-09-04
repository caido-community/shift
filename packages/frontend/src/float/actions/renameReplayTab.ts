import { z } from "zod";

import { type ActionContext, type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const renameReplayTabSchema = z.object({
  name: z.literal("renameReplayTab"),
  parameters: z.object({
    newName: z.string().min(1).describe("New name for the replay tab"),
    sessionId: z
      .string()
      .describe(
        'Session ID of the replay tab to rename. This is optional, leave empty for the current tab. If users says, rename "this tab", then most likely he refers to the current tab.'
      ),
  }),
});

export type RenameReplayTabInput = z.infer<typeof renameReplayTabSchema>;

export const renameReplayTab: ActionDefinition<RenameReplayTabInput> = {
  name: "renameReplayTab",
  description: "Rename a replay session tab",
  inputSchema: renameReplayTabSchema,
  execute: async (
    sdk: FrontendSDK,
    { newName, sessionId }: RenameReplayTabInput["parameters"],
    context: ActionContext
  ) => {
    const contextSessionId = (context.replay?.value as { sessionId?: string })
      ?.sessionId;

    const targetSessionId = sessionId || contextSessionId;
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
};
