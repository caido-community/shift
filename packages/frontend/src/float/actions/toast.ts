import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const toastVariants = ["info", "success", "warning", "error"] as const;

export const toastSchema = z.object({
  name: z.literal("toast"),
  parameters: z.object({
    content: z.string().min(1, "Toast content cannot be empty."),
    variant: z.enum(toastVariants).optional(),
    duration: z
      .number()
      .int()
      .positive()
      .max(60_000, "Duration must be less than 60 seconds.")
      .optional(),
  }),
});

export type ToastInput = z.infer<typeof toastSchema>;

export const toast: ActionDefinition<ToastInput> = {
  name: "toast",
  description: "Show a toast message to the user",
  inputSchema: toastSchema,
  execute: (
    sdk: FrontendSDK,
    { content, variant, duration }: ToastInput["parameters"],
  ) => {
    const finalVariant = variant ?? "info";
    const finalDuration = duration ?? 3000;

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
