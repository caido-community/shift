import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const AddCookieSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "The cookie name to set in the Cookie header (e.g., sessionid, auth_token).",
    ),
  value: z
    .string()
    .describe(
      "The cookie value to append. If cookie already exists, it will not be replaced.",
    ),
});

export const addCookieTool = tool({
  description:
    "Append a cookie to the Cookie header of the current HTTP request draft without replacing existing cookies with the same name.",
  inputSchema: AddCookieSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft)
          .addCookie(input.name, input.value)
          .build();
      });

      return {
        message: hasChanged
          ? "Cookie appended to request"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to add cookie: ${message}` };
    }
  },
});


