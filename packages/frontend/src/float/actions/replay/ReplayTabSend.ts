import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type ActionResult as ActionResultType } from "@/float/types";

const inputSchema = z.object({});

export const replayTabSendTool = tool({
  description: "Send the current replay tab request",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: (): ActionResultType => {
    const sendButton = document.querySelector("[aria-label=Send]") as HTMLElement;

    if (sendButton === null) {
      return ActionResult.err("Send request button not found");
    }

    sendButton.click();

    return ActionResult.ok("Replay tab request sent");
  },
});
