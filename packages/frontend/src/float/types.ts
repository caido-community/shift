import { z } from "zod";

import { registeredActions } from "@/float/actions";
import { type FrontendSDK } from "@/types";

type ActionInputSchema = z.ZodObject<{
  name: z.ZodLiteral<string>;
  parameters: z.ZodObject<z.ZodRawShape>;
}>;

export type ActionDefinition<
  TInput extends { parameters: unknown } = z.infer<ActionInputSchema>,
> = {
  name: string;
  description: string;
  inputSchema: ActionInputSchema;
  execute: (
    sdk: FrontendSDK,
    input: TInput["parameters"],
    context: ActionContext,
  ) => Promise<ActionResult> | ActionResult;
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

export const ActionSchema = z.discriminatedUnion(
  "name",
  registeredActions.map((action) => action.inputSchema) as [
    ActionInputSchema,
    ...ActionInputSchema[],
  ],
);

export type Action = z.infer<typeof ActionSchema>;

export type ActionQuery = {
  content: string;
  context: ActionContext;
};

type ActionContextValue = {
  description: string;
  value: unknown;
};

export type ActionContext = Record<string, ActionContextValue>;

export type ActionsExecutionResult =
  | {
      success: true;
      actions: Action[];
    }
  | {
      success: false;
      error: string;
    };

export type QueryShiftState = "Idle" | "Streaming";
export type QueryShiftEvent =
  | { state: "Streaming"; actions?: Action[] }
  | { state: "Error"; error: string }
  | { state: "Done" };
