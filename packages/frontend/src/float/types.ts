import { type Result } from "shared";
import { z } from "zod";

import { type FrontendSDK } from "@/types";

export type FloatToolContext = {
  sdk: FrontendSDK;
  context: ActionContext;
};

type ActionContextValue = {
  description: string;
  value: unknown;
};

export type ActionContext = Record<string, ActionContextValue>;

export type ActionQueryInput = {
  content: string;
  context: ActionContext;
  abortSignal?: AbortSignal;
};

type FrontendError = {
  message: string;
  detail?: string;
};

const frontendErrorSchema = z.object({
  message: z.string(),
  detail: z.string().optional(),
});

export type ActionResult = Result<{ message: string }, FrontendError>;
export const ActionResult = {
  schema: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("Ok"),
      value: z.object({ message: z.string() }),
    }),
    z.object({
      kind: z.literal("Error"),
      error: frontendErrorSchema,
    }),
  ]),
  ok: (message: string): ActionResult => ({ kind: "Ok", value: { message } }),
  err: (message: string, detail?: string): ActionResult => ({
    kind: "Error",
    error: { message, detail },
  }),
};
