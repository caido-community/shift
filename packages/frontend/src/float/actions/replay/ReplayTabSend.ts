import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";

const inputSchema = z.object({});

export const replayTabSendTool = tool({
  description: "Send the current replay tab request",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: (): ToolResult => {
    const sendButton = document.querySelector("[aria-label=Send]") as HTMLElement;

    if (sendButton === null) {
      return ToolResult.err("Send request button not found");
    }

    sendButton.click();

    return ToolResult.ok({ message: "Replay tab request sent" });
  },
});
