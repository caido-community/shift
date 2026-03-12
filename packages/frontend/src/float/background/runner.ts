import { generateText, stepCountIs } from "ai";

import { plainParts } from "@/backgroundAgents/logs";
import { backgroundFloatTools } from "@/float/actions";
import { BACKGROUND_EXECUTION_NOTE, buildBackgroundPrompt } from "@/float/background/prompt";
import {
  getInvalidToolCallMessage,
  isInvalidToolCall,
  isValidToolCall,
} from "@/float/background/toolCalls";
import { getToolErrorMessage, getToolResultLogParts } from "@/float/background/toolResults";
import { buildSystemPrompt } from "@/float/prompt";
import { repairToolCall } from "@/float/toolCallRepair";
import { type ActionContext, type FloatToolContext } from "@/float/types";
import { useBackgroundAgentsStore } from "@/stores/backgroundAgents";
import { useLearningsStore } from "@/stores/learnings";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { createModel, resolveModel } from "@/utils";

const DEFAULT_BACKGROUND_MAX_STEPS = 100;
type SpawnBackgroundAgentInput = {
  sdk: FrontendSDK;
  task: string;
  title: string;
  context: ActionContext;
};

export const spawnBackgroundAgent = (input: SpawnBackgroundAgentInput): string => {
  const store = useBackgroundAgentsStore();
  const agentId = store.createAgent({
    task: input.task,
    title: input.title,
  });

  const controller = new AbortController();
  store.registerController(agentId, controller);

  void runBackgroundAgent({
    ...input,
    agentId,
    abortSignal: controller.signal,
  }).finally(() => {
    store.clearController(agentId);
  });

  return agentId;
};

type RunBackgroundAgentInput = SpawnBackgroundAgentInput & {
  agentId: string;
  abortSignal: AbortSignal;
};

const runBackgroundAgent = async (input: RunBackgroundAgentInput): Promise<void> => {
  const store = useBackgroundAgentsStore();
  const settingsStore = useSettingsStore();
  const learningsStore = useLearningsStore();
  const modelsStore = useModelsStore();

  store.setRunning(input.agentId);

  const modelData = resolveModel({
    sdk: input.sdk,
    savedModelKey: settingsStore.floatModel,
    enabledModels: modelsStore.getEnabledModels({ usageType: "float" }),
    usageType: "float",
  });

  if (modelData === undefined) {
    store.appendLog(input.agentId, plainParts("No models available"), "error");
    store.setError(input.agentId, "No models available");
    return;
  }

  const model = createModel(input.sdk, modelData, {
    reasoning: true,
    openRouterPrioritizeFastProviders: settingsStore.openRouterPrioritizeFastProviders ?? false,
  });

  const toolContext: FloatToolContext = {
    sdk: input.sdk,
    context: input.context,
  };

  const tools = backgroundFloatTools;
  const configuredMaxIterations = settingsStore.maxIterations;
  const maxSteps = configuredMaxIterations ?? DEFAULT_BACKGROUND_MAX_STEPS;
  const prompt = buildBackgroundPrompt(
    {
      content: input.task,
      context: input.context,
    },
    learningsStore.entries
  );

  let executionError: string | undefined;
  let hasToolCall = false;

  let system = buildSystemPrompt({
    backgroundAgents: false,
  });

  system += `\n\n<background_mode>\nYou are executing in background mode. Complete the user task with tools and keep actions concise.\n</background_mode>\n\n${BACKGROUND_EXECUTION_NOTE}`;

  try {
    const result = await generateText({
      model,
      temperature: 0,
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(maxSteps),
      system,
      prompt,
      abortSignal: input.abortSignal,
      experimental_context: toolContext,
      experimental_repairToolCall: async ({ toolCall, inputSchema, error }) =>
        (await repairToolCall(toolCall, inputSchema, error)) ?? null,
      onStepFinish: ({ toolCalls, toolResults }) => {
        if (toolCalls.some(isValidToolCall)) {
          hasToolCall = true;
        }

        for (const toolCall of toolCalls) {
          if (isInvalidToolCall(toolCall)) {
            executionError = getInvalidToolCallMessage(toolCall);
            store.appendLog(input.agentId, plainParts(executionError), "error");
            throw new Error(executionError);
          }
        }

        for (const toolResult of toolResults) {
          const { toolName, output } = toolResult;
          const errorMessage = getToolErrorMessage(output);
          if (errorMessage !== undefined) {
            executionError = `${toolName}: ${errorMessage}`;
            store.appendLog(input.agentId, plainParts(executionError), "error");
            throw new Error(executionError);
          }

          store.appendLog(
            input.agentId,
            getToolResultLogParts(toolName, toolResult.input, output),
            "success"
          );
        }
      },
    });

    if (executionError !== undefined) {
      store.setError(input.agentId, executionError);
      return;
    }

    const hasAnyToolExecution = hasToolCall || result.toolCalls.some(isValidToolCall);
    if (!hasAnyToolExecution) {
      store.setError(input.agentId, "No tool calls were made");
      return;
    }

    if (result.finishReason === "error") {
      store.setError(input.agentId, "Background agent failed before completing the task");
      return;
    }

    store.setDone(input.agentId);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      store.appendLog(input.agentId, plainParts("Background agent was cancelled"));
      store.setAborted(input.agentId);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (executionError === message) {
      store.setError(input.agentId, message);
      return;
    }

    store.appendLog(input.agentId, plainParts(message), "error");
    store.setError(input.agentId, message);
  }
};
