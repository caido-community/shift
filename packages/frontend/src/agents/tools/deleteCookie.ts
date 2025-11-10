import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const DeleteCookieSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "The cookie name to remove from the Cookie header (e.g., sessionid, auth_token).",
    ),
});

export const deleteCookieTool = tool({
  description:
    "Remove a cookie from the Cookie header of the current HTTP request draft.",
  inputSchema: DeleteCookieSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft).removeCookie(input.name).build();
      });

      return {
        message: hasChanged
          ? "Cookie removed from request"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to delete cookie: ${message}` };
    }
  },
});


