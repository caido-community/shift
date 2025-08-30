import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const ReplaceRequestTextSchema = z.object({
  match: z
    .string()
    .min(1)
    .describe("The exact text string to find and replace"),
  replace: z.string().describe("The replacement text"),
});

export const replaceRequestTextTool = tool({
  description:
    "Find and replace specific text strings anywhere in the HTTP request (headers, body, path, etc.). Use this for precise string replacements when other specific tools don't cover your needs. Supports literal string matching only.",
  inputSchema: ReplaceRequestTextSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        if (input.match === "") return draft;
        if (typeof draft.replaceAll === "function") {
          return draft.replaceAll(input.match, input.replace);
        }
        return draft.split(input.match).join(input.replace);
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed. No replacements were made.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to match and replace: ${message}` };
    }
  },
});
