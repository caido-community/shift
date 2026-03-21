import { stepCountIs, ToolLoopAgent } from "ai";
import type { AgentMode, Model } from "shared";

import type { AgentContext } from "@/agent/context";
import { buildAgentInstructions } from "@/agent/instructions";
import { shiftAgentTools } from "@/agent/tools";
import { repairToolCall } from "@/float/toolCallRepair";
import { type FrontendSDK } from "@/types";
import { createModel, type ReasoningEffort } from "@/utils/ai";

function getToolsForMode(mode: AgentMode) {
  const tools = { ...shiftAgentTools };
  return tools;
}

type AgentOptions = {
  sdk: FrontendSDK;
  model: Model;
  context: AgentContext;
  maxIterations: number;
  reasoningEffort: ReasoningEffort;
  openRouterPrioritizeFastProviders: boolean;
};

export const createShiftAgent = (options: AgentOptions) => {
  const { sdk, model, context, maxIterations, reasoningEffort, openRouterPrioritizeFastProviders } =
    options;

  const caidoModel = createModel(sdk, model, {
    reasoningEffort,
    openRouterPrioritizeFastProviders,
  });
  const tools = getToolsForMode(context.mode);
  const agent = new ToolLoopAgent({
    model: caidoModel,
    instructions: buildAgentInstructions({
      context,
      steps: 0,
      maxSteps: maxIterations,
      model,
    }),
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(maxIterations),
    maxRetries: 3,
    experimental_context: context,
    experimental_repairToolCall: async ({ toolCall, inputSchema, error }) =>
      (await repairToolCall(toolCall, inputSchema, error)) ?? null,
    prepareStep: async ({ messages, ...settings }) => {
      await context.fetchEntriesInfo();

      return {
        ...settings,
        messages,
        system: buildAgentInstructions({
          context,
          steps: settings.steps.length,
          maxSteps: maxIterations,
          model,
        }),
      };
    },
    onStepFinish: (data) => {
      console.log(data);
    },
  });

  return agent;
};
