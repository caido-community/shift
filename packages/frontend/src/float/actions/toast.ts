import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const toastVariants = ["info", "success", "warning", "error"] as const;

const toastSchema = z.object({
  name: z.literal("toast"),
  parameters: z.object({
    content: z.string().describe("Toast content (non-empty)"),
    variant: z
      .enum(toastVariants)
      .nullable()
      .describe("Toast variant, use null for default (info)"),
    duration: z
      .number()
      .nullable()
      .describe(
        "Duration in ms (integer, positive, max 60000). Use null for default (3000)",
      ),
  }),
});

type ToastInput = z.infer<typeof toastSchema>;

export const toast: ActionDefinition<ToastInput> = {
  name: "toast",
  description: "Show a toast message to the user",
  inputSchema: toastSchema,
  execute: (
    sdk: FrontendSDK,
    { content, variant, duration }: ToastInput["parameters"],
  ) => {
    const finalVariant = variant === null ? "info" : variant;
    const finalDuration = duration === null ? 3000 : duration;

    sdk.window.showToast(content, {
      variant: finalVariant,
      duration: finalDuration,
    });

    return {
      success: true,
      frontend_message: "",
    };
  },
};
