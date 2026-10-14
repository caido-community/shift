import { Result } from "shared";
import { type z } from "zod";

import {
  type FrontendError,
  type MessageOnly,
  messageSchema,
  resultSchema,
  type ToolResult,
  type WithMessage,
} from "@/agent/types";
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

export type ActionResult<TValue = undefined> = ToolResult<TValue>;

export const ActionResult = {
  schema: resultSchema(messageSchema),
  schemaWithValue: <T extends z.ZodTypeAny>(valueSchema: T) =>
    resultSchema(valueSchema.and(messageSchema)),
  isOk: <TValue = undefined>(
    value: unknown
  ): value is {
    kind: "Ok";
    value: TValue extends undefined ? MessageOnly : WithMessage<TValue>;
  } => {
    if (!Result.isResult(value) || !Result.isOk(value)) {
      return false;
    }

    if (typeof value.value !== "object" || value.value === null) {
      return false;
    }

    return "message" in value.value && typeof value.value.message === "string";
  },
  isErr: (value: unknown): value is { kind: "Error"; error: FrontendError } => {
    if (!Result.isResult(value) || !Result.isErr(value)) {
      return false;
    }

    if (typeof value.error !== "object" || value.error === null) {
      return false;
    }

    if (!("message" in value.error) || typeof value.error.message !== "string") {
      return false;
    }

    return (
      !("detail" in value.error) ||
      value.error.detail === undefined ||
      typeof value.error.detail === "string"
    );
  },
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
