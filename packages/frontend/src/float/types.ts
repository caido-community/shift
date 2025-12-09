import { type FrontendSDK } from "@/types";

export type FloatToolContext = {
  sdk: FrontendSDK;
  context: ActionContext;
};

export type ActionResult =
  | {
      success: true;
      frontend_message: string;
    }
  | {
      success: false;
      error: string;
    };

export type ActionQuery = {
  content: string;
  context: ActionContext;
};

type ActionContextValue = {
  description: string;
  value: unknown;
};

export type ActionContext = Record<string, ActionContextValue>;
