import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const toastVariants = ["info", "success", "warning", "error"] as const;

const inputSchema = z.object({
  content: z.string().describe("Toast content (non-empty)"),
  variant: z.enum(toastVariants).nullable().describe("Toast variant, use null for default (info)"),
  duration: z.number().min(1000).max(60000).describe("Duration in milliseconds."),
});

export const toastTool = tool({
  description: "Show a toast message to the user",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ content, variant, duration }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const finalVariant = variant === null ? "info" : variant;
    const finalDuration = duration === null ? 3000 : duration;

    if (content !== "") {
      sdk.window.showToast(content, {
        variant: finalVariant,
        duration: finalDuration,
      });
    }

    return ActionResult.ok("");
  },
});
