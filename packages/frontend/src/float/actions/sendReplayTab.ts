import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";

const InputSchema = z.object({});

export const sendReplayTabTool = tool({
  description: "Send the current replay tab request",
  inputSchema: InputSchema,
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
});
