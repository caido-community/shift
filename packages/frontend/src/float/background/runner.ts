import { getErrorMessage } from "@ai-sdk/provider";
import { stepCountIs, streamText } from "ai";

import { createCompactor } from "@/agent/compaction";
import { formatAgentError } from "@/agent/utils/errors";
import { plainParts } from "@/backgroundAgents/logs";
import { backgroundFloatTools } from "@/float/actions";
import { BACKGROUND_EXECUTION_NOTE } from "@/float/background/prompt";
import { getInvalidToolCallMessage } from "@/float/background/toolCalls";
import { getToolErrorMessage, getToolResultLogParts } from "@/float/background/toolResults";
import { buildUserPrompt } from "@/float/context";
import { createFloatModel } from "@/float/model";
import { buildSystemPrompt } from "@/float/prompt";
import { type ActionContext, type FloatToolContext } from "@/float/types";
import { useBackgroundAgentsStore } from "@/stores/backgroundAgents";
import { useLearningsStore } from "@/stores/learnings";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { repairToolCall } from "@/utils/toolCallRepair";

type SpawnBackgroundAgentInput = {
  sdk: FrontendSDK;
  task: string;
  title: string;
  context: ActionContext;
};

export const spawnBackgroundAgent = (input: SpawnBackgroundAgentInput): string => {
  const store = useBackgroundAgentsStore();
  const { id: agentId, signal } = store.createAgent({
    task: input.task,
    title: input.title,
  });

  void runBackgroundAgent({ ...input, agentId, abortSignal: signal });

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

  store.setRunning(input.agentId);

  try {
    const floatModel = createFloatModel(input.sdk, {
      savedModelKey: settingsStore.config.floatModel,
      reasoning: true,
      cacheKey: input.agentId,
    });

    if (floatModel === undefined) {
      store.appendLog(input.agentId, plainParts("No models available"), "error");
      store.finishAgent(input.agentId, "error", "No models available");
      return;
    }

    const { model, modelData } = floatModel;

    const toolContext: FloatToolContext = {
      sdk: input.sdk,
      context: input.context,
    };

    const tools = backgroundFloatTools;
    const maxSteps = settingsStore.config.maxIterations;
    const prompt = buildUserPrompt(
      { content: input.task, context: input.context },
      useLearningsStore().entries
    );
    const system = `${buildSystemPrompt({ backgroundAgents: false })}\n\n${BACKGROUND_EXECUTION_NOTE}`;

    let hasToolCall = false;
    let consecutiveFailedSteps = 0;
    let streamError: unknown;

    const compactor = createCompactor({
      model,
      system,
      tools,
      contextWindow: modelData.contextWindow,
      abortSignal: input.abortSignal,
      onCompact: () => {
        store.appendLog(input.agentId, plainParts("Compacted context to keep going"));
      },
    });

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
      prepareStep: compactor.prepareStep,
      onError: ({ error }) => {
        streamError = error;
      },
      onStepFinish: (step) => {
        compactor.onStepFinish(step);
        const { toolCalls, toolResults, content } = step;
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
      store.finishAgent(input.agentId, "aborted");
      return;
    }

    if (streamError !== undefined) {
      const message = formatAgentError(streamError);
      store.appendLog(input.agentId, plainParts(message), "error");
      store.finishAgent(input.agentId, "error", message);
      return;
    }

    const summary = (await result.text).trim();
    if (summary !== "") {
      store.appendLog(input.agentId, plainParts(summary));
    }

    if (consecutiveFailedSteps >= MAX_CONSECUTIVE_FAILED_STEPS) {
      store.finishAgent(input.agentId, "error", "Stopped after repeated tool failures");
      return;
    }

    if (!hasToolCall) {
      store.finishAgent(input.agentId, "error", "No tool calls were made");
      return;
    }

    store.finishAgent(input.agentId, "done");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      store.appendLog(input.agentId, plainParts("Background agent was cancelled"));
      store.finishAgent(input.agentId, "aborted");
      return;
    }

    const message = formatAgentError(error);
    store.appendLog(input.agentId, plainParts(message), "error");
    store.finishAgent(input.agentId, "error", message);
  }
};
