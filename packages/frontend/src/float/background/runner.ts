import { generateText, stepCountIs } from "ai";

import { backgroundFloatTools } from "@/float/actions";
import { buildSystemPrompt } from "@/float/prompt";
import { type ActionContext, type FloatToolContext } from "@/float/types";
import { useBackgroundAgentsStore } from "@/stores/backgroundAgents";
import { useLearningsStore } from "@/stores/learnings";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { createModel, resolveModel } from "@/utils";

const DEFAULT_BACKGROUND_MAX_STEPS = 40;
const BACKGROUND_EXECUTION_NOTE = `<background_execution_note>
You are a long-running background agent with a larger time/step budget than normal Float runs.
For multi-step tasks, prefer iterative execution over one-shot decisions.
When tools return partial data, continue reading/searching/paginating until you have enough coverage to make a reliable decision.
If a tool response indicates more data exists (for example hasNextPage, nextOffset, or cursor-based continuation), keep iterating before final write actions.
For HTTP history investigation tasks (analyze, identify, find flow, auth, login, oauth, reset, token, session), do not finalize after a single historyRead page when more data may exist.
For these history tasks, first paginate historyRead to build candidate sets, then perform focused deep inspection with historyRequestResponseRead before deciding final row IDs.
Do not call final write actions like httpqlQuerySet/filter/scope updates until at least one deep inspection pass is completed when request/response semantics matter.
When historyRead output includes both rowId and requestId, use rowId for row.id HTTPQL filtering and requestId for historyRequestResponseRead.
Use the available step budget for depth and confidence; optimize for correctness and coverage, not minimum step count.
Before final write actions, synthesize findings from gathered evidence and then apply concise, high-confidence changes.
Use available step budget for quality and completeness, but stop early once task goals are fully satisfied.
</background_execution_note>`;

type SpawnBackgroundAgentInput = {
  sdk: FrontendSDK;
  task: string;
  title: string;
  context: ActionContext;
};

type ToolErrorOutput = {
  kind?: string;
  error?: {
    message?: string;
  };
};

type ToolOkOutput = {
  kind?: string;
  value?: {
    message?: string;
  };
};

const buildPrompt = (
  input: { content: string; context: ActionContext },
  learnings: string[]
): string => {
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
};

const getToolErrorMessage = (output: unknown): string | undefined => {
  if (typeof output !== "object" || output === null) {
    return undefined;
  }

  const candidate = output as ToolErrorOutput;
  if (candidate.kind === "Error") {
    return candidate.error?.message ?? "Tool execution failed";
  }

  return undefined;
};

const getToolSuccessMessage = (output: unknown): string | undefined => {
  if (typeof output !== "object" || output === null) {
    return undefined;
  }

  const candidate = output as ToolOkOutput;
  if (candidate.kind === "Ok") {
    const message = candidate.value?.message;
    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }

  return undefined;
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
    store.appendLog(input.agentId, "No models available", "error");
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
  const maxSteps =
    configuredMaxIterations === undefined
      ? DEFAULT_BACKGROUND_MAX_STEPS
      : Math.max(DEFAULT_BACKGROUND_MAX_STEPS, configuredMaxIterations);
  const prompt = buildPrompt(
    {
      content: input.task,
      context: input.context,
    },
    learningsStore.entries
  );

  let executionError: string | undefined;
  let hasToolCall = false;
  let hasSuccessfulToolResult = false;

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
      onStepFinish: ({ toolCalls, toolResults }) => {
        if (toolCalls.length > 0) {
          hasToolCall = true;
        }

        for (const toolCall of toolCalls) {
          if (toolCall.toolName === "backgroundAgentSpawn") {
            store.appendLog(
              input.agentId,
              "Ignored invalid tool call: backgroundAgentSpawn",
              "error"
            );
            continue;
          }
          store.appendLog(input.agentId, `Calling ${toolCall.toolName}`);
        }

        for (const { toolName, output } of toolResults) {
          const errorMessage = getToolErrorMessage(output);
          if (errorMessage !== undefined) {
            executionError = `${toolName}: ${errorMessage}`;
            store.completeToolLog(input.agentId, toolName, executionError, "error");
            continue;
          }

          const successMessage = getToolSuccessMessage(output);
          if (successMessage !== undefined) {
            hasSuccessfulToolResult = true;
            store.completeToolLog(input.agentId, toolName, successMessage, "success");
          } else {
            hasSuccessfulToolResult = true;
            store.completeToolLog(input.agentId, toolName, `${toolName} completed`, "success");
          }
        }
      },
    });

    if (executionError !== undefined) {
      store.setError(input.agentId, executionError);
      return;
    }

    const hasAnyToolExecution = hasToolCall || result.toolCalls.length > 0;
    if (!hasAnyToolExecution) {
      store.setError(input.agentId, "No tool calls were made");
      return;
    }

    if (result.finishReason === "error") {
      if (!hasSuccessfulToolResult) {
        store.setError(input.agentId, "Background agent failed before completing any tool");
        return;
      }
      store.setDone(input.agentId);
      return;
    }

    store.setDone(input.agentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "USER_ABORTED" || message === "Request cancelled") {
      store.appendLog(input.agentId, "Background agent was cancelled");
      store.setAborted(input.agentId);
      return;
    }

    store.appendLog(input.agentId, message, "error");
    store.setError(input.agentId, message);
  }
};
