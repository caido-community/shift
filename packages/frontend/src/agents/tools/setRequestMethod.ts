import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const SetRequestMethodSchema = z.object({
  method: z
    .string()
    .min(1)
    .describe("The HTTP method to set (e.g., GET, POST, PUT, DELETE)"),
});

export const setRequestMethodTool = tool({
  description:
    "Change the HTTP method of the current request (GET, POST, PUT, DELETE, etc.). Use this when you need to test different HTTP verbs or modify the request method for testing purposes.",
  inputSchema: SetRequestMethodSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft).method(input.method).build();
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to set method: ${message}` };
    }
  },
});
