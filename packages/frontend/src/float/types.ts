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

type MessageOnly = { message: string };
type WithMessage<T> = T & MessageOnly;

export type ActionResult<TValue = undefined> = Result<
  TValue extends undefined ? MessageOnly : WithMessage<TValue>,
  FrontendError
>;

const defaultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("Ok"),
    value: z.object({ message: z.string() }),
  }),
  z.object({
    kind: z.literal("Error"),
    error: frontendErrorSchema,
  }),
]);

export const ActionResult = {
  schema: defaultSchema,
  schemaWithValue: <T extends z.ZodTypeAny>(valueSchema: T) =>
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("Ok"),
        value: valueSchema.and(z.object({ message: z.string() })),
      }),
      z.object({
        kind: z.literal("Error"),
        error: frontendErrorSchema,
      }),
    ]),
  ok: (message: string): ActionResult => ({ kind: "Ok", value: { message } }),
  okWithValue: <TValue>(value: WithMessage<TValue>): ActionResult<TValue> => ({
    kind: "Ok",
    value: value as TValue extends undefined ? MessageOnly : WithMessage<TValue>,
  }),
  err: <TValue = never>(message: string, detail?: string): ActionResult<TValue> => ({
    kind: "Error",
    error: { message, detail },
  }),
};
