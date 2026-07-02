import type { SkillSnapshot, SkillsPromptSnapshot } from "@/agent/context.prompt.types";
import { truncateContextValue } from "@/agent/context.truncation";
import { truncate } from "@/utils/text";

export {
  type ContextPromptSnapshot,
  type EnvironmentVariablePreviewSnapshot,
  type LearningPreviewSnapshot,
  type SkillsPromptSnapshot,
} from "@/agent/context.prompt.types";

export const ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS = 400;

export const LEARNING_VALUE_CHARS = 1_000;

export const SKILL_CONTENT_CHARS = 8_000;
export const AGENT_INSTRUCTIONS_CHARS = 16_000;
export const ENVIRONMENT_NAME_CHARS = 100;

export function buildSkillsPrompt(snapshot: SkillsPromptSnapshot): string {
  const agentInstructions = snapshot.agentInstructions?.trim() ?? "";
  const skills = snapshot.skills ?? [];

  if (skills.length === 0 && agentInstructions === "") {
    return "";
  }

  const parts: string[] = [];

  if (agentInstructions !== "") {
    const truncated = truncateContextValue(agentInstructions, AGENT_INSTRUCTIONS_CHARS);
    parts.push(`<agent_instructions>\n${truncated}\n</agent_instructions>`);
  }

  if (skills.length > 0) {
    const alwaysAttached: Extract<SkillSnapshot, { kind: "always-attached" }>[] = [];
    const onDemand: Extract<SkillSnapshot, { kind: "on-demand" }>[] = [];

    for (const s of skills) {
      if (s.kind === "always-attached") alwaysAttached.push(s);
      else onDemand.push(s);
    }

    const skillParts: string[] = [];

    for (const skill of alwaysAttached) {
      const content = truncateContextValue(skill.content, SKILL_CONTENT_CHARS, {
        retrievalHint: "Use ReadSkill with this skill id for the full instructions.",
      });
      skillParts.push(`<skill id="${skill.id}" title="${skill.title}">\n${content}\n</skill>`);
    }

    if (onDemand.length > 0) {
      const catalogLines = onDemand.map((s) => {
        const desc = s.description?.trim();
        return desc !== ""
          ? `- ${s.title} (id: ${s.id}): ${truncate(desc, 200)}`
          : `- ${s.title} (id: ${s.id})`;
      });
      skillParts.push(
        `<skills_available_on_demand>\n${catalogLines.join("\n")}\n</skills_available_on_demand>\n\n` +
          `These on-demand skills are knowledge books that contain instructions, testing guidance, and reusable context for particular tasks, workflows, or areas of expertise. When a skill looks relevant to what you are about to do, use the ReadSkill tool with its id to load and follow that skill's instructions. Prefer reading the relevant skill early rather than guessing from memory.`
      );
    }

    parts.push(skillParts.join("\n"));
  }

  return `<additional_instructions>\n${parts.join("\n")}\n</additional_instructions>`;
}
