import { stepCountIs, ToolLoopAgent } from "ai";
import { type Model } from "shared";

import type { AgentContext } from "@/agent/context";
import { BASE_SYSTEM_PROMPT } from "@/agent/prompt";
import { shiftAgentTools } from "@/agent/tools";
import { trimOldToolCalls } from "@/agent/utils/messages";
import { type FrontendSDK } from "@/types";
import { createModel } from "@/utils/ai";

function buildInstructions(context: AgentContext): string {
  const parts: string[] = [BASE_SYSTEM_PROMPT];

  const skillsPrompt = context.toSkillsPrompt();
  if (skillsPrompt !== "") {
    parts.push(skillsPrompt);
  }

  const contextPrompt = context.toContextPrompt();
  if (contextPrompt !== "") {
    parts.push(contextPrompt);
  }

  return parts.join("\n\n");
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
    // Trim old tool calls/results to reduce context size while preserving text content
    prepareStep: ({ messages }) => {
      const trimmed = trimOldToolCalls(messages, 15);
      return { messages: trimmed };
    },
  });

  return agent;
};
