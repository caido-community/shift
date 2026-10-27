import { stepCountIs, type Tool, ToolLoopAgent } from "ai";
import type { Model, ShiftMessage } from "shared";

import { createCompactor, estimateToolsCharacters } from "@/agent/compaction";
import type { AgentContext } from "@/agent/context";
import { buildAgentInstructions } from "@/agent/instructions";
import { shiftAgentTools } from "@/agent/tools";
import { getEstimatedContextUsage } from "@/agent/utils/contextUsage";
import { type FrontendSDK } from "@/types";
import { createModel, type ReasoningEffort } from "@/utils/ai";
import { repairToolCall } from "@/utils/toolCallRepair";

const toolsCharacters = new Map<Record<string, Tool>, number>();

export function getToolsCharacters(tools: Record<string, Tool>): number {
  let characters = toolsCharacters.get(tools);
  if (characters === undefined) {
    characters = estimateToolsCharacters(tools);
    toolsCharacters.set(tools, characters);
  }
  return characters;
}

export function getAgentSetup(context: AgentContext) {
  const skillsPrompt = context.toSkillsPrompt();
  return {
    tools: shiftAgentTools,
    skillsPrompt,
    instructions: buildAgentInstructions({ mode: context.mode, skillsPrompt }),
  };
}

type AgentOptions = {
  sdk: FrontendSDK;
  model: Model;
  context: AgentContext;
  messages: ShiftMessage[];
  maxIterations: number;
  reasoningEffort: ReasoningEffort;
  openRouterPrioritizeFastProviders: boolean;
  fastMode: boolean;
  ultrafast: boolean;
  daybreak: boolean;
  abortSignal?: AbortSignal;
};

export const createShiftAgent = (options: AgentOptions) => {
  const {
    sdk,
    model,
    context,
    messages,
    maxIterations,
    reasoningEffort,
    openRouterPrioritizeFastProviders,
    fastMode,
    ultrafast,
    daybreak,
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
  const { tools, instructions, skillsPrompt } = getAgentSetup(context);
  const compactor = createCompactor({
    model: caidoModel,
    system: instructions,
    tools,
    contextWindow: model.contextWindow,
    abortSignal,
    initialTokens: getEstimatedContextUsage({
      model,
      systemPrompt: instructions,
      skillsPrompt,
      toolsCharacters: getToolsCharacters(tools),
      messages,
    }).usedTokens,
    onCompact: (summary) => {
      context.writer?.write({ type: "data-compaction", data: { summary } });
    },
    onCompacting: (active) => {
      context.writer?.write({ type: "data-compacting", data: active, transient: true });
    },
    onMeasure: (contextTokens) => {
      context.writer?.write({ type: "message-metadata", messageMetadata: { contextTokens } });
    },
  });
  return new ToolLoopAgent({
    model: caidoModel,
    instructions,
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(maxIterations),
    maxRetries: 3,
    experimental_context: context,
    experimental_repairToolCall: repairToolCall,
    prepareStep: compactor.prepareStep,
    onStepFinish: compactor.onStepFinish,
  });
};
