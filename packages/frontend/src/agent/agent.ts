import { stepCountIs, ToolLoopAgent } from "ai";
import type { Model } from "shared";

import { createCompactor } from "@/agent/compaction";
import type { AgentContext } from "@/agent/context";
import { buildAgentInstructions } from "@/agent/instructions";
import { shiftAgentTools } from "@/agent/tools";
import { AI_TRACE_RUN_ID_HEADER } from "@/agent/trace";
import { repairToolCall } from "@/float/toolCallRepair";
import { type FrontendSDK } from "@/types";
import { createModel, type ReasoningEffort } from "@/utils/ai";

export function getTools(legacyTodos: boolean) {
  if (legacyTodos) return shiftAgentTools;
  const { TodoAdd, TodoStart, TodoComplete, TodoRemove, ...tools } = shiftAgentTools;
  return tools;
}

type AgentOptions = {
  sdk: FrontendSDK;
  model: Model;
  context: AgentContext;
  maxIterations: number;
  reasoningEffort: ReasoningEffort;
  openRouterPrioritizeFastProviders: boolean;
  legacyTodos: boolean;
  fastMode?: boolean;
  ultrafast?: boolean;
  daybreak?: boolean;
  traceRunId?: string;
  abortSignal?: AbortSignal;
};

export const createShiftAgent = (options: AgentOptions) => {
  const {
    sdk,
    model,
    context,
    maxIterations,
    reasoningEffort,
    openRouterPrioritizeFastProviders,
    legacyTodos,
    fastMode,
    ultrafast,
    daybreak,
    traceRunId,
    abortSignal,
  } = options;

  const caidoModel = createModel(sdk, model, {
    reasoningEffort,
    openRouterPrioritizeFastProviders,
    fastMode,
    ultrafast,
    daybreak,
    cacheKey: context.sessionId,
  });
  const tools = getTools(legacyTodos);
  const instructions = buildAgentInstructions({ context, model, legacyTodos });
  const compact = createCompactor({
    model: caidoModel,
    system: instructions,
    tools,
    contextWindow: model.contextWindow,
    abortSignal,
    onCompact: (summary) => {
      context.writer?.write({ type: "data-compaction", data: { summary } });
    },
  });
  return new ToolLoopAgent({
    model: caidoModel,
    instructions,
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(maxIterations),
    maxRetries: 3,
    ...(traceRunId === undefined ? {} : { headers: { [AI_TRACE_RUN_ID_HEADER]: traceRunId } }),
    experimental_context: context,
    experimental_repairToolCall: async ({ toolCall, inputSchema, error }) =>
      (await repairToolCall(toolCall, inputSchema, error)) ?? null,
    prepareStep: async (settings) => {
      await context.fetchEntriesInfo();
      return compact(settings);
    },
  });
};
