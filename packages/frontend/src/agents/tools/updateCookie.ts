import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const UpdateCookieSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "The cookie name to update within the Cookie header (e.g., sessionid, auth_token).",
    ),
  value: z
    .string()
    .describe(
      "The new value to set for the cookie. Existing cookie value will be replaced.",
    ),
});

export const updateCookieTool = tool({
  description:
    "Update the value of an existing cookie in the Cookie header of the current HTTP request draft. If the cookie does not exist, it will be added.",
  inputSchema: UpdateCookieSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft)
          .setCookie(input.name, input.value)
          .build();
      });

      return {
        message: hasChanged
          ? "Cookie updated in request"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to update cookie: ${message}` };
    }
  },
});


