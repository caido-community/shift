import { stepCountIs, ToolLoopAgent } from "ai";
import type { AgentMode, Model } from "shared";

import type { AgentContext } from "@/agent/context";
import { BASE_SYSTEM_PROMPT, WILDCARD_MODE_PROMPT } from "@/agent/prompt";
import { shiftAgentTools } from "@/agent/tools";
import { trimOldToolCalls } from "@/agent/utils/messages";
import { type FrontendSDK } from "@/types";
import { createModel } from "@/utils/ai";

type BuildInstructionsOptions = {
  context: AgentContext;
  steps: number;
  maxSteps: number;
  model: Model;
};

function isGeminiModel(model: Model): boolean {
  return model.id.toLowerCase().includes("gemini");
}

function getToolsForMode(mode: AgentMode) {
  const tools = { ...shiftAgentTools };
  return tools;
}

const RECENT_TOOL_MESSAGES = 15;

function buildInstructions(options: BuildInstructionsOptions): string {
  const { context, steps, maxSteps, model } = options;
  const parts: string[] = [BASE_SYSTEM_PROMPT];

  if (context.mode === "wildcard") {
    parts.push(WILDCARD_MODE_PROMPT);
  }

  // TODO: temporary fix, seems like signatures are broken when agent returns multiple toolcalls
  if (isGeminiModel(model)) {
    parts.push(
      `IMPORTANT: You must NEVER call multiple tools in parallel. Only call ONE tool per response. ` +
        `Wait for each tool result before making the next tool call.`
    );
  }

  const skillsPrompt = context.toSkillsPrompt();
  if (skillsPrompt !== "") {
    parts.push(skillsPrompt);
  }

  const contextPrompt = context.toContextPrompt();
  if (contextPrompt !== "") {
    parts.push(contextPrompt);
  }

  if (steps > 0) {
    parts.push(
      `You have already completed ${steps} iterations out of a maximum of ${maxSteps}. ` +
        (steps >= maxSteps * 0.8
          ? `You are approaching the iteration limit, so start wrapping up your work. `
          : "") +
        `The agent will automatically pause when it reaches ${maxSteps} iterations, but you can stop at any time once your task is complete.`
    );
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
  const tools = getToolsForMode(context.mode);
  const agent = new ToolLoopAgent({
    model: caidoModel,
    instructions: buildInstructions({
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
    // Trim old tool calls/results to reduce context size while preserving text content
    prepareStep: ({ messages, ...settings }) => ({
      ...settings,
      messages: trimOldToolCalls(messages, RECENT_TOOL_MESSAGES),
      system: buildInstructions({
        context,
        steps: settings.steps.length,
        maxSteps: maxIterations,
        model,
      }),
    }),
  });

  return agent;
};
