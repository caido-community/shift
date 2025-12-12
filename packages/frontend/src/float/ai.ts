import { InvalidToolInputError, stepCountIs, streamText } from "ai";
import Ajv from "ajv";

import { floatTools } from "@/float/actions";
import { SYSTEM_PROMPT } from "@/float/prompt";
import {
  type ActionQuery,
  type ActionResult,
  type FloatToolContext,
} from "@/float/types";
import { useConfigStore } from "@/stores/config";
import { type FrontendSDK } from "@/types";
import { createModel } from "@/utils";

const ajv = new Ajv({ coerceTypes: true });

type QueryShiftResult = { success: true } | { success: false; error: string };

export async function queryShift(
  sdk: FrontendSDK,
  input: ActionQuery,
): Promise<QueryShiftResult> {
  const configStore = useConfigStore();
  const model = createModel(sdk, configStore.floatModel, { reasoning: false });

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

  const toolContext: FloatToolContext = {
    sdk,
    context: input.context,
  };

  let executionError: string | undefined;

  try {
    const result = streamText({
      model,
      temperature: 0,
      tools: floatTools,
      toolChoice: "required",
      stopWhen: stepCountIs(1),
      system: SYSTEM_PROMPT,
      prompt,
      experimental_context: toolContext,

      // try to coerce the tool call input to the schema, helps if model returns invalid type but it can be coerced to the correct type
      experimental_repairToolCall: ({ toolCall, inputSchema, error }) => {
        if (!(error instanceof InvalidToolInputError)) {
          return Promise.resolve(null);
        }

        const schema = inputSchema({ toolName: toolCall.toolName });
        const data = JSON.parse(toolCall.input);

        ajv.validate(schema, data);

        return Promise.resolve({
          ...toolCall,
          input: JSON.stringify(data),
        });
      },
      onStepFinish: ({ toolResults }) => {
        for (const { toolName, output } of toolResults) {
          const toolResult = output as ActionResult;

          if (!toolResult.success) {
            executionError = `${toolName}: ${toolResult.error}`;
            console.error("executionError", executionError);
            return;
          }

          if (toolResult.frontend_message) {
            sdk.window.showToast(toolResult.frontend_message, {
              variant: "info",
              duration: 3000,
            });
          }
        }
      },
    });

    await result.consumeStream();
    const toolCalls = await result.toolCalls;

    if (toolCalls.length === 0) {
      return { success: false, error: "No tool calls were made" };
    }

    const invalidToolCall = toolCalls.find(
      (call) => "invalid" in call && call.invalid === true,
    );
    if (invalidToolCall && "error" in invalidToolCall) {
      const error = invalidToolCall.error as Error;
      console.error("invalidToolCall error", error);
      return {
        success: false,
        error: `Error occurred while calling tool ${invalidToolCall.toolName}. See the console for detailed logs.`,
      };
    }

    if (executionError !== undefined) {
      return { success: false, error: executionError };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
