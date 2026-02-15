import { type LanguageModelV3ToolCall } from "@ai-sdk/provider";
import { generateText, InvalidToolInputError, stepCountIs } from "ai";
import Ajv from "ajv";
import { Result } from "shared";

import { floatTools } from "@/float/actions";
import { SYSTEM_PROMPT } from "@/float/prompt";
import { type ActionQueryInput, type ActionResult, type FloatToolContext } from "@/float/types";
import { useLearningsStore } from "@/stores/learnings";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { createModel, resolveModel } from "@/utils";

const ajv = new Ajv({ coerceTypes: true });

function buildPrompt(input: ActionQueryInput, learnings: string[]): string {
  return `
<context>
${JSON.stringify(input.context)}
</context>

<learnings>
${learnings.map((learning, index) => `- ${index}: ${learning}`).join("\n")}
</learnings>

<user>
${input.content}
</user>
`.trim();
}

function processToolResult(
  sdk: FrontendSDK,
  toolName: string,
  output: ActionResult
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

function repairToolCall(
  toolCall: LanguageModelV3ToolCall,
  inputSchema: (options: { toolName: string }) => object,
  error: unknown
): LanguageModelV3ToolCall | undefined {
  if (!(error instanceof InvalidToolInputError)) {
    return undefined;
  }

  const schema = inputSchema({ toolName: toolCall.toolName });
  const data = JSON.parse(toolCall.input);
  ajv.validate(schema, data);

  return {
    ...toolCall,
    input: JSON.stringify(data),
  };
}

export async function queryShift(sdk: FrontendSDK, input: ActionQueryInput): Promise<Result> {
  const settingsStore = useSettingsStore();
  const learningsStore = useLearningsStore();
  const modelsStore = useModelsStore();

  const modelData = resolveModel({
    sdk,
    savedModelKey: settingsStore.floatModel,
    enabledModels: modelsStore.getEnabledModels({ usageType: "float" }),
    usageType: "float",
  });
  if (modelData === undefined) {
    return Result.err("No models available");
  }

  const openRouterPrioritizeFastProviders =
    settingsStore.openRouterPrioritizeFastProviders ?? false;
  const model = createModel(sdk, modelData, {
    reasoning: false,
    openRouterPrioritizeFastProviders,
  });
  const learnings = learningsStore.entries;
  const prompt = buildPrompt(input, learnings);

  const toolContext: FloatToolContext = {
    sdk,
    context: input.context,
  };

  let executionError: string | undefined;

  try {
    const result = await generateText({
      model,
      temperature: 0,
      tools: floatTools,
      toolChoice: "required",
      stopWhen: stepCountIs(1),
      system: SYSTEM_PROMPT,
      prompt,
      abortSignal: input.abortSignal,
      experimental_context: toolContext,
      experimental_repairToolCall: ({ toolCall, inputSchema, error }) =>
        Promise.resolve(repairToolCall(toolCall, inputSchema, error) ?? null),
      onStepFinish: ({ toolResults }) => {
        for (const { toolName, output } of toolResults) {
          const error = processToolResult(sdk, toolName, output as ActionResult);
          if (error !== undefined) {
            executionError = error;
            return;
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

    const invalidToolCall = result.toolCalls.find(
      (call) => "invalid" in call && call.invalid === true
    );
    if (invalidToolCall !== undefined && "error" in invalidToolCall) {
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
      return Result.err("USER_ABORTED");
    }

    const message = error instanceof Error ? error.message : String(error);
    const truncatedMessage = message.length > 250 ? message.slice(0, 250) + "..." : message;
    return Result.err(truncatedMessage);
  }
}
