import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";

const sendReplayTabSchema = z.object({
  name: z.literal("sendReplayTab"),
  parameters: z.object({}),
});

type SendReplayTabInput = z.infer<typeof sendReplayTabSchema>;

export const sendReplayTab: ActionDefinition<SendReplayTabInput> = {
  name: "sendReplayTab",
  description: "Send the current replay tab request",
  inputSchema: sendReplayTabSchema,
  execute: () => {
    try {
      const sendButton = document.querySelector(
        "[aria-label=Send]",
      ) as HTMLElement;

      if (sendButton === null) {
        return {
          success: false,
          error: "Send request button not found",
        };
      }

      sendButton.click();

      return actionSuccess("Replay tab request sent");
    } catch (error) {
      return actionError("Failed to send replay tab request", error);
    }
  },
};
