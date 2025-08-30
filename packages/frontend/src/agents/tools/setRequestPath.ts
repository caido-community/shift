import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const SetRequestPathSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      "The URL path to set (e.g., /api/users, /admin/login). This will modify the first line of the request, so note to not use uncommon chars like spaces or newlines.",
    ),
});

export const setRequestPathTool = tool({
  description:
    "Change the URL path of the current request. Use this to test different endpoints, access restricted paths, or modify the target resource being requested.",
  inputSchema: SetRequestPathSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft).path(input.path).build();
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to set path: ${message}` };
    }
  },
});
