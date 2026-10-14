import type { Model } from "shared";

import type { AgentContext } from "./context";
import { BASE_SYSTEM_PROMPT, TODOS_PROMPT, WILDCARD_MODE_PROMPT } from "./prompt";

type BuildInstructionsOptions = {
  context: AgentContext;
  model: Model | undefined;
  legacyTodos?: boolean;
};

export function buildAgentInstructions(options: BuildInstructionsOptions): string {
  const { context, legacyTodos = false } = options;
  const parts: string[] = [BASE_SYSTEM_PROMPT];

  if (context.mode === "wildcard") {
    parts.push(WILDCARD_MODE_PROMPT);
  }

  if (legacyTodos) {
    parts.push(TODOS_PROMPT);
  }

  const skillsPrompt = context.toSkillsPrompt();
  if (skillsPrompt !== "") {
    parts.push(skillsPrompt);
  }

  return parts.join("\n\n");
}
