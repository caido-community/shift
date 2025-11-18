import { generateObject } from "ai";

import { registeredActions } from "@/float/actions";
import { SYSTEM_PROMPT } from "@/float/prompt";
import {
  type Action,
  type ActionContext,
  type ActionQuery,
  ActionSchema,
  type ActionsExecutionResult,
  type QueryShiftEvent,
} from "@/float/types";
import { useConfigStore } from "@/stores/config";
import { type FrontendSDK } from "@/types";

async function generateActions(sdk: FrontendSDK, input: ActionQuery) {
  const configStore = useConfigStore();
  const provider = sdk.ai.createProvider();
  // @ts-ignore
  const model = provider(configStore.floatModel);

  const learnings = configStore.learnings.map((value, index) => ({
    index,
    value,
  }));

  const prompt = `
  <context>
  ${JSON.stringify(input.context)}
  </context>

  <learnings>
  ${JSON.stringify(learnings, null, 2)}
  </learnings>

  <user>
  ${input.content}
  </user>
  `.trim();

  const { object } = await generateObject({
    model,
    temperature: 0,
    output: "array",
    schema: ActionSchema,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return object;
}

const execute = async (
  sdk: FrontendSDK,
  actions: Action[],
  context: ActionContext,
): Promise<ActionsExecutionResult> => {
  try {
    for (const action of actions) {
      const actionFn = registeredActions.find((a) => a.name === action.name);
      if (actionFn) {
        const { inputSchema, execute } = actionFn;

        const validatedInput = inputSchema.parse(action);
        const result = await execute(sdk, validatedInput.parameters, context);
        if (!result.success) {
          return {
            success: false,
            error: action.name + ": " + result.error,
          };
        }

        if (result.frontend_message && result.frontend_message !== "") {
          sdk.window.showToast(result.frontend_message, {
            variant: "info",
            duration: 3000,
          });
        }
      }
    }

    return {
      success: true,
      actions,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export async function* queryShiftStream(
  sdk: FrontendSDK,
  input: ActionQuery,
): AsyncGenerator<QueryShiftEvent, ActionsExecutionResult, void> {
  yield { state: "Streaming" };
  try {
    const actions = await generateActions(sdk, input);

    if (actions.length === 0) {
      sdk.window.showToast("No actions were generated for your request", {
        variant: "info",
        duration: 3000,
      });
      yield { state: "Done" };
      return { success: true, actions: [] };
    }

    yield { state: "Streaming", actions };

    const result = await execute(sdk, actions, input.context);
    if (!result.success) {
      yield { state: "Error", error: result.error };
      return result;
    }

    yield { state: "Done" };
    return { success: true, actions };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    yield { state: "Error", error: msg };
    return { success: false, error: msg };
  }
}
