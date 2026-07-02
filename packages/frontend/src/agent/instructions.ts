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
