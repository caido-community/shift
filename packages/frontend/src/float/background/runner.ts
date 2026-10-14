import { getErrorMessage } from "@ai-sdk/provider";
import { stepCountIs, streamText } from "ai";
import { DEFAULT_MAX_ITERATIONS } from "shared";

import { createCompactor } from "@/agent/compaction";
import { formatAgentError } from "@/agent/utils/errors";
import { plainParts } from "@/backgroundAgents/logs";
import { backgroundFloatTools } from "@/float/actions";
import { BACKGROUND_EXECUTION_NOTE, buildBackgroundPrompt } from "@/float/background/prompt";
import { getInvalidToolCallMessage } from "@/float/background/toolCalls";
import { getToolErrorMessage, getToolResultLogParts } from "@/float/background/toolResults";
import { buildSystemPrompt } from "@/float/prompt";
import { type ActionContext, type FloatToolContext } from "@/float/types";
import { useBackgroundAgentsStore } from "@/stores/backgroundAgents";
import { useLearningsStore } from "@/stores/learnings";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { createModel, resolveModel } from "@/utils";
import { repairToolCall } from "@/utils/toolCallRepair";

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

const MAX_CONSECUTIVE_FAILED_STEPS = 5;

const runBackgroundAgent = async (input: RunBackgroundAgentInput): Promise<void> => {
  const store = useBackgroundAgentsStore();
  const settingsStore = useSettingsStore();
  const learningsStore = useLearningsStore();
  const modelsStore = useModelsStore();

  store.setRunning(input.agentId);

  const modelData = resolveModel({
    sdk: input.sdk,
    savedModelKey: settingsStore.floatModel,
    enabledModels: modelsStore.getEnabledModels(),
    usageType: "float",
  });

  if (modelData === undefined) {
    store.appendLog(input.agentId, plainParts("No models available"), "error");
    store.setError(input.agentId, "No models available");
    return;
  }

  const model = createModel(input.sdk, modelData, {
    reasoning: true,
    ...settingsStore.getRequestOptions(modelData),
    cacheKey: input.agentId,
  });

  const toolContext: FloatToolContext = {
    sdk: input.sdk,
    context: input.context,
  };

  const tools = backgroundFloatTools;
  const maxSteps = settingsStore.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const prompt = buildBackgroundPrompt(
    {
      content: input.task,
      context: input.context,
    },
    learningsStore.entries
  );
  const system = `${buildSystemPrompt({ backgroundAgents: false })}\n\n${BACKGROUND_EXECUTION_NOTE}`;

  let hasToolCall = false;
  let consecutiveFailedSteps = 0;
  let streamError: unknown;

  const compact = createCompactor({
    model,
    system,
    tools,
    contextWindow: modelData.contextWindow,
    abortSignal: input.abortSignal,
    onCompact: () => {
      store.appendLog(input.agentId, plainParts("Compacted context to keep going"));
    },
  });

  try {
    // Streamed: Caido caps non-streaming completions at 5 minutes per step.
    const result = streamText({
      model,
      tools,
      toolChoice: "auto",
      stopWhen: [
        stepCountIs(maxSteps),
        () => consecutiveFailedSteps >= MAX_CONSECUTIVE_FAILED_STEPS,
      ],
      system,
      prompt,
      maxRetries: 3,
      abortSignal: input.abortSignal,
      experimental_context: toolContext,
      experimental_repairToolCall: repairToolCall,
      prepareStep: compact,
      onError: ({ error }) => {
        streamError = error;
      },
      onStepFinish: ({ toolCalls, toolResults, content }) => {
        hasToolCall ||= toolCalls.some((toolCall) => toolCall.invalid !== true);

        let failures = 0;
        const invalidToolCallIds = new Set<string>();
        for (const toolCall of toolCalls) {
          if (toolCall.invalid === true) {
            failures++;
            invalidToolCallIds.add(toolCall.toolCallId);
            store.appendLog(
              input.agentId,
              plainParts(getInvalidToolCallMessage(toolCall)),
              "error"
            );
          }
        }

        for (const part of content) {
          if (part.type === "tool-error" && !invalidToolCallIds.has(part.toolCallId)) {
            failures++;
            store.appendLog(
              input.agentId,
              plainParts(`${part.toolName}: ${getErrorMessage(part.error)}`),
              "error"
            );
          }
        }

        for (const toolResult of toolResults) {
          const { toolName, output } = toolResult;
          const errorMessage = getToolErrorMessage(output);
          if (errorMessage !== undefined) {
            failures++;
            store.appendLog(input.agentId, plainParts(`${toolName}: ${errorMessage}`), "error");
            continue;
          }

          store.appendLog(
            input.agentId,
            getToolResultLogParts(toolName, toolResult.input, output),
            "success"
          );
        }

        const allFailed = toolCalls.length > 0 && failures >= toolCalls.length;
        consecutiveFailedSteps = allFailed ? consecutiveFailedSteps + 1 : 0;
      },
    });

    await result.consumeStream();

    if (input.abortSignal.aborted) {
      store.appendLog(input.agentId, plainParts("Background agent was cancelled"));
      store.setAborted(input.agentId);
      return;
    }

    if (streamError !== undefined) {
      const message = formatAgentError(streamError);
      store.appendLog(input.agentId, plainParts(message), "error");
      store.setError(input.agentId, message);
      return;
    }

    const summary = (await result.text).trim();
    if (summary !== "") {
      store.appendLog(input.agentId, plainParts(summary));
    }

    if (consecutiveFailedSteps >= MAX_CONSECUTIVE_FAILED_STEPS) {
      store.setError(input.agentId, "Stopped after repeated tool failures");
      return;
    }

    if (!hasToolCall) {
      store.setError(input.agentId, "No tool calls were made");
      return;
    }

    store.setDone(input.agentId);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      store.appendLog(input.agentId, plainParts("Background agent was cancelled"));
      store.setAborted(input.agentId);
      return;
    }

    const message = formatAgentError(error);
    store.appendLog(input.agentId, plainParts(message), "error");
    store.setError(input.agentId, message);
  }
};
