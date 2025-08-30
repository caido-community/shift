import { z } from "zod";

import { type ActionDefinition } from "@/float/types";

export const sendReplayTabSchema = z.object({
  name: z.literal("sendReplayTab"),
  parameters: z.object({}),
});

export type SendReplayTabInput = z.infer<typeof sendReplayTabSchema>;

export const sendReplayTab: ActionDefinition<SendReplayTabInput> = {
  name: "sendReplayTab",
  description: "Send the current replay tab request",
  inputSchema: sendReplayTabSchema,
  execute: () => {
    try {
      const sendButton = document.querySelector(
        "[aria-label=Send]",
      ) as HTMLElement;

      if (sendButton === undefined) {
        return {
          success: false,
          error: "Send request button not found",
        };
      }

      sendButton.click();

      return {
        success: true,
        frontend_message: "Replay tab request sent",
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send replay tab request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
