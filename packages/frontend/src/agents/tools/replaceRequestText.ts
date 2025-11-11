import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const ReplaceRequestTextSchema = z
  .object({
    match: z
      .string()
      .min(1)
      .describe("The text string or regex pattern to find and replace"),
    replace: z.string().describe("The replacement text"),
    useRegex: z
      .boolean()
      .optional()
      .default(false)
      .describe("When true, treat match as a regular expression pattern"),
    flags: z
      .string()
      .optional()
      .describe(
        "Regex flags to apply when useRegex is true (the global flag 'g' will be added automatically if omitted)",
      ),
  })
  .refine(
    (data) => {
      if (data.flags !== undefined && data.useRegex !== true) {
        return false;
      }
      return true;
    },
    {
      message: "Regex flags can only be provided when useRegex is true",
      path: ["flags"],
    },
  );

export const replaceRequestTextTool = tool({
  description: `
  The replaceRequestText tool is used to find and replace specific text strings anywhere in the HTTP request (headers, body, path, etc.). 
  ONLY use this tool if you cannot use the other more specific tools to achieve the same result.
  Supports literal string matching by default, and can optionally use regular expressions.
  `,
  inputSchema: ReplaceRequestTextSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      let regex: RegExp | undefined;
      if (input.useRegex) {
        const flags = input.flags ?? "g";
        const normalizedFlags = flags.includes("g") ? flags : `${flags}g`;
        try {
          regex = new RegExp(input.match, normalizedFlags);
        } catch (regexError) {
          const message =
            regexError instanceof Error
              ? regexError.message
              : String(regexError);
          return { error: `Invalid regex pattern: ${message}` };
        }
      }

      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        if (input.match === "") return draft;
        if (regex !== undefined) {
          return draft.replace(regex, input.replace);
        }
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
