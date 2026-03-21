import type { ModelMessage } from "ai";
import type { Model } from "shared";

import type { AgentContext } from "./context";
import { BASE_SYSTEM_PROMPT, WILDCARD_MODE_PROMPT } from "./prompt";

const GEMINI_PARALLEL_TOOLS_WARNING =
  "IMPORTANT: You must NEVER call multiple tools in parallel. Only call ONE tool per response. " +
  "Wait for each tool result before making the next tool call.";

type BuildInstructionsOptions = {
  context: AgentContext;
  model: Model | undefined;
};

type BuildRuntimeContextMessageOptions = {
  context: AgentContext;
  steps: number;
  maxSteps: number;
};

const RUNTIME_CONTEXT_MESSAGE_PREFIX = "<runtime_context>";

function buildIterationStatus(steps: number, maxSteps: number): string {
  if (steps === 0) {
    return `You are about to start iteration 1 out of a maximum of ${maxSteps}.`;
  }

  return (
    `You have already completed ${steps} iterations out of a maximum of ${maxSteps}. ` +
    (steps >= maxSteps * 0.8
      ? "You are approaching the iteration limit, so start wrapping up your work. "
      : "") +
    `The agent will automatically pause when it reaches ${maxSteps} iterations, but you can stop at any time once your task is complete.`
  );
}

export function buildRuntimeContextMessage(
  options: BuildRuntimeContextMessageOptions
): ModelMessage | undefined {
  const { context, steps, maxSteps } = options;
  const parts: string[] = [];

  const contextPrompt = context.toContextPrompt();
  if (contextPrompt !== "") {
    parts.push(contextPrompt);
  }

  parts.push(buildIterationStatus(steps, maxSteps));

  if (parts.length === 0) {
    return undefined;
  }

  return {
    role: "user",
    content: `${RUNTIME_CONTEXT_MESSAGE_PREFIX}\n${parts.join("\n\n")}\n</runtime_context>`,
  };
}

export function withRuntimeContextMessage(
  messages: ModelMessage[],
  runtimeContextMessage: ModelMessage | undefined
): ModelMessage[] {
  const withoutExisting = messages.filter(
    (message) =>
      !(
        message.role === "user" &&
        typeof message.content === "string" &&
        message.content.startsWith(RUNTIME_CONTEXT_MESSAGE_PREFIX)
      )
  );

  return runtimeContextMessage !== undefined
    ? [...withoutExisting, runtimeContextMessage]
    : withoutExisting;
}

function isGeminiModel(model: Model | undefined): boolean {
  return model?.id.toLowerCase().includes("gemini") ?? false;
}

export function buildAgentInstructions(options: BuildInstructionsOptions): string {
  const { context, model } = options;
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

  return parts.join("\n\n");
}
