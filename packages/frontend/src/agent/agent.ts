import { stepCountIs, ToolLoopAgent, type SystemModelMessage } from "ai";
import { type Model } from "shared";

import type { AgentContext } from "@/agent/context";
import { BASE_SYSTEM_PROMPT } from "@/agent/prompt";
import { shiftAgentTools } from "@/agent/tools";
import { type FrontendSDK } from "@/types";
import { createModel } from "@/utils/ai";

function buildInstructions(context: AgentContext): SystemModelMessage[] {
  const messages: SystemModelMessage[] = [
    {
      role: "system",
      content: BASE_SYSTEM_PROMPT,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
        google: { cacheControl: { type: "ephemeral" } },
        openrouter: { cacheControl: { type: "ephemeral" } },
      },
    },
  ];

  const skillsPrompt = context.toSkillsPrompt();
  if (skillsPrompt !== "") {
    messages.push({
      role: "system",
      content: skillsPrompt,
    });
  }

  const contextPrompt = context.toContextPrompt();
  if (contextPrompt !== "") {
    messages.push({
      role: "system",
      content: contextPrompt,
    });
  }

  return messages;
}

type AgentOptions = {
  sdk: FrontendSDK;
  model: Model;
  context: AgentContext;
  maxIterations: number;
};

export const createShiftAgent = (options: AgentOptions) => {
  const { sdk, model, context, maxIterations } = options;

  const caidoModel = createModel(sdk, model);
  const agent = new ToolLoopAgent({
    model: caidoModel,
    instructions: buildInstructions(context),
    tools: shiftAgentTools,
    toolChoice: "auto",
    stopWhen: stepCountIs(maxIterations),
    maxRetries: 3,
    experimental_context: context,
  });

  return agent;
};
