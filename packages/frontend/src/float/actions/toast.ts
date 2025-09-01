import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const toastSchema = z.object({
  name: z.literal("toast"),
  parameters: z.object({
    content: z.string(),
  }),
});

export type ToastInput = z.infer<typeof toastSchema>;

export const toast: ActionDefinition<ToastInput> = {
  name: "toast",
  description: "Show a toast message to the user",
  inputSchema: toastSchema,
  execute: (_: FrontendSDK, { content }: ToastInput["parameters"]) => {
    return {
      success: true,
      frontend_message: content,
    };
  },
};
