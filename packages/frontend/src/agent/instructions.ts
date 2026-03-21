import type { Model } from "shared";

import type { AgentContext } from "./context";
import { BASE_SYSTEM_PROMPT, WILDCARD_MODE_PROMPT } from "./prompt";

const GEMINI_PARALLEL_TOOLS_WARNING =
  "IMPORTANT: You must NEVER call multiple tools in parallel. Only call ONE tool per response. " +
  "Wait for each tool result before making the next tool call.";

type BuildInstructionsOptions = {
  context: AgentContext;
  steps: number;
  maxSteps: number;
  model: Model | undefined;
};

function isGeminiModel(model: Model | undefined): boolean {
  return model?.id.toLowerCase().includes("gemini") ?? false;
}

export function buildAgentInstructions(options: BuildInstructionsOptions): string {
  const { context, steps, maxSteps, model } = options;
  const parts: string[] = [BASE_SYSTEM_PROMPT];

  if (context.mode === "wildcard") {
    parts.push(WILDCARD_MODE_PROMPT);
  }

  // TODO: temporary fix, seems like signatures are broken when agent returns multiple toolcalls
  if (isGeminiModel(model)) {
    parts.push(GEMINI_PARALLEL_TOOLS_WARNING);
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
