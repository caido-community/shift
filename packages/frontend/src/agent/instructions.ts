import type { AgentMode } from "shared";

import { BASE_SYSTEM_PROMPT, WILDCARD_MODE_PROMPT } from "./prompt";

type BuildInstructionsOptions = {
  mode: AgentMode;
  skillsPrompt: string;
};

export function buildAgentInstructions(options: BuildInstructionsOptions): string {
  const { mode, skillsPrompt } = options;
  const parts: string[] = [BASE_SYSTEM_PROMPT];

  if (mode === "wildcard") {
    parts.push(WILDCARD_MODE_PROMPT);
  }

  if (skillsPrompt !== "") {
    parts.push(skillsPrompt);
  }

  return parts.join("\n\n");
}
