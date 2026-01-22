import { fetch } from "caido:http";
import type { AgentSkill, DynamicSkillDefinition } from "shared";

import { validateSkillUrl } from "./validation";
export { validateSkillUrl };

export async function fetchSkillContent(
  skill: DynamicSkillDefinition
): Promise<AgentSkill | undefined> {
  const validation = validateSkillUrl(skill.url);
  if (!validation.valid) {
    return undefined;
  }

  try {
    const response = await fetch(skill.url);
    if (!response.ok) {
      return undefined;
    }

    const content = await response.text();
    return {
      id: skill.id,
      title: skill.title,
      content,
    };
  } catch {
    return undefined;
  }
}
