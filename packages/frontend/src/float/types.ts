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
