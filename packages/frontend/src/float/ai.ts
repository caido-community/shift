import { getErrorMessage } from "@ai-sdk/provider";
import { generateText } from "ai";
import { Result } from "shared";

import { type ToolResult } from "@/agent/types";
import { getCoreFloatTools } from "@/float/actions";
import { buildUserPrompt } from "@/float/context";
import { createFloatModel } from "@/float/model";
import { buildSystemPrompt } from "@/float/prompt";
import { type ActionQueryInput, type FloatToolContext } from "@/float/types";
import { useLearningsStore } from "@/stores/learnings";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { repairToolCall } from "@/utils/toolCallRepair";

function processToolResult(
  sdk: FrontendSDK,
  toolName: string,
  output: ToolResult
): string | undefined {
  switch (output.kind) {
    case "Error":
      if (output.error.detail !== undefined) {
        console.error(`${toolName} detail:`, output.error.detail);
      }
      return `${toolName}: ${output.error.message}`;
    case "Ok": {
      const message = output.value.message.trim();
      if (message !== "") {
        sdk.window.showToast(message, {
          variant: "info",
          duration: 3000,
        });
      }
      return undefined;
    }
  }
}

export async function queryShift(sdk: FrontendSDK, input: ActionQueryInput): Promise<Result> {
  const floatModel = createFloatModel(sdk, {
    savedModelKey: useSettingsStore().config.floatModel,
    reasoning: false,
  });
  if (floatModel === undefined) {
    return Result.err("No models available");
  }

  const prompt = buildUserPrompt(input, useLearningsStore().entries);

  const toolContext: FloatToolContext = {
    sdk,
    context: input.context,
  };

  let executionError: string | undefined;
  const backgroundAgentsEnabled = useSettingsStore().isFeatureEnabled("backgroundAgents");

  try {
    const result = await generateText({
      model: floatModel.model,
      tools: getCoreFloatTools(),
      toolChoice: "required",
      system: buildSystemPrompt({
        backgroundAgents: backgroundAgentsEnabled,
      }),
      prompt,
      abortSignal: input.abortSignal,
      experimental_context: toolContext,
      experimental_repairToolCall: repairToolCall,
      onStepFinish: ({ content }) => {
        for (const part of content) {
          if (part.type === "tool-result") {
            const error = processToolResult(sdk, part.toolName, part.output as ToolResult);
            executionError ??= error;
          } else if (part.type === "tool-error") {
            executionError ??= `${part.toolName}: ${getErrorMessage(part.error)}`;
          }
        }
      },
    });

    if (result.finishReason === "error") {
      return Result.err(
        "Generation failed. This could be a bug, if this happens again, please report this to the Caido team."
      );
    }

    if (result.toolCalls.length === 0) {
      return Result.err("No tool calls were made. Try to rephrase your request.");
    }

    const invalidToolCall = result.toolCalls.find((call) => call.invalid === true);
    if (invalidToolCall !== undefined) {
      return Result.err(
        `Model returned invalid input for tool ${invalidToolCall.toolName}. Consider using different model or rephrase your request.`
      );
    }

    if (executionError !== undefined) {
      return Result.err(executionError);
    }

    return Result.ok(undefined);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Result.err("Request aborted");
    }

    const message = error instanceof Error ? error.message : String(error);
    const truncatedMessage = message.length > 250 ? message.slice(0, 250) + "..." : message;
    return Result.err(truncatedMessage);
  }
}
