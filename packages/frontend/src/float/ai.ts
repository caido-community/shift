import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamObject } from "ai";

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

function streamActions(input: ActionQuery) {
  const configStore = useConfigStore();
  const openrouter = createOpenRouter({
    apiKey: configStore.openRouterApiKey,
  });
  const model = openrouter(configStore.floatModel);

  const prompt = `
  <context>
  ${JSON.stringify(input.context)}
  </context>

  <memory>
  ${configStore.memory.trim()}
  </memory>

  <user>
  ${input.content}
  </user>
  `.trim();

  const { elementStream } = streamObject({
    model,
    temperature: 0,
    output: "array",
    schema: ActionSchema,
    system: SYSTEM_PROMPT,
    prompt,
    onError: ({ error }) => {
      throw error;
    },
  });

  return elementStream;
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
    const stream = streamActions(input);
    const executed: Action[] = [];
    for await (const action of stream) {
      yield { state: "Streaming", actions: [action] };
      const result = await execute(sdk, [action], input.context);
      if (!result.success) {
        yield { state: "Error", error: result.error };
        return result;
      }
      executed.push(action);
    }

    if (executed.length === 0) {
      sdk.window.showToast("No actions were generated for your request", {
        variant: "info",
        duration: 3000,
      });
    }

    yield { state: "Done" };
    return { success: true, actions: executed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    yield { state: "Error", error: msg };
    return { success: false, error: msg };
  }
}
