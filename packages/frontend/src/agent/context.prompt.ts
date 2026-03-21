import type {
  ContextPromptSnapshot,
  EnvironmentVariablePreviewSnapshot,
  LearningPreviewSnapshot,
  SkillSnapshot,
  SkillsPromptSnapshot,
} from "@/agent/context.prompt.types";
import { truncateContextValue } from "@/agent/context.truncation";
import { isPresent } from "@/utils";
import { truncate } from "@/utils/text";

export {
  type ContextPromptSnapshot,
  type EnvironmentVariablePreviewSnapshot,
  type LearningPreviewSnapshot,
  type SkillsPromptSnapshot,
} from "@/agent/context.prompt.types";

export const HTTP_REQUEST_CONTEXT_CHARS = 12_000;
export const ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS = 400;
export const ENVIRONMENT_VARIABLES_CONTEXT_CHARS = 8_000;

export const TODO_CONTENT_CHARS = 500;
export const LEARNING_VALUE_CHARS = 1_000;
export const LEARNINGS_TOTAL_CHARS = 12_000;

export const SKILL_CONTENT_CHARS = 8_000;
export const AGENT_INSTRUCTIONS_CHARS = 16_000;
export const WORKFLOW_NAME_CHARS = 200;
export const WORKFLOW_DESCRIPTION_CHARS = 500;
const WORKFLOWS_TOTAL_CHARS = 6_000;

const BINARY_PATH_CHARS = 256;
export const BINARY_INSTRUCTIONS_CHARS = 1_000;
const BINARIES_TOTAL_CHARS = 4_000;
export const ENVIRONMENT_NAME_CHARS = 100;
const ENVIRONMENTS_TOTAL_CHARS = 2_000;

export function buildContextPrompt(snapshot: ContextPromptSnapshot): string {
  const parts: string[] = [];

  if (isPresent(snapshot.todos) && snapshot.todos.length > 0) {
    const todoList = snapshot.todos
      .map((t) => {
        const content = truncateContextValue(t.content, TODO_CONTENT_CHARS);
        return `- [${t.status}] (id: ${t.id}) ${content}`;
      })
      .join("\n");
    parts.push(`<todos>\n${todoList}\n</todos>`);
  }

  if (isPresent(snapshot.learnings) && snapshot.learnings.length > 0) {
    const truncatedLearnings = snapshot.learnings.map((learning) =>
      toLearningPreviewEntry(learning)
    );
    let serialized = JSON.stringify(truncatedLearnings, null, 2);
    serialized = truncateContextValue(serialized, LEARNINGS_TOTAL_CHARS);
    parts.push(`<learnings>\n${serialized}\n</learnings>`);
  }

  if (isPresent(snapshot.httpRequest) && snapshot.httpRequest !== "") {
    const requestForPrompt = truncateContextValue(
      snapshot.httpRequest,
      HTTP_REQUEST_CONTEXT_CHARS,
      {
        retrievalHint: "Use RequestRangeRead for more.",
      }
    );
    parts.push(`<current_http_request>\n${requestForPrompt}\n</current_http_request>`);
  }

  if (isPresent(snapshot.allowedConvertWorkflows) && snapshot.allowedConvertWorkflows.length > 0) {
    const truncatedWorkflows = snapshot.allowedConvertWorkflows.map((w) => ({
      id: w.id,
      name: truncateContextValue(w.name, WORKFLOW_NAME_CHARS),
      description: truncateContextValue(w.description, WORKFLOW_DESCRIPTION_CHARS),
    }));
    let workflowList = JSON.stringify(truncatedWorkflows, null, 2);
    workflowList = truncateContextValue(workflowList, WORKFLOWS_TOTAL_CHARS);
    parts.push(`<allowed_convert_workflows>\n${workflowList}\n</allowed_convert_workflows>`);
  }

  if (isPresent(snapshot.allowedBinaries)) {
    const truncatedBinaries = snapshot.allowedBinaries.map((b) => ({
      path: truncateContextValue(b.path, BINARY_PATH_CHARS),
      instructions:
        isPresent(b.instructions) && b.instructions.trim() !== ""
          ? truncateContextValue(b.instructions, BINARY_INSTRUCTIONS_CHARS)
          : undefined,
    }));
    let binaryList = JSON.stringify(truncatedBinaries, null, 2);
    binaryList = truncateContextValue(binaryList, BINARIES_TOTAL_CHARS);
    parts.push(`<allowed_binaries>\n${binaryList}\n</allowed_binaries>`);
  }

  if (isPresent(snapshot.entriesContext) && snapshot.entriesContext.recentEntryIds.length > 0) {
    const { activeEntryId, recentEntryIds } = snapshot.entriesContext;
    const entryList = recentEntryIds.join(", ");
    const activeLine =
      isPresent(activeEntryId) && activeEntryId !== ""
        ? `Active entry: ${activeEntryId}`
        : "No active entry";
    parts.push(`<replay_entries>${entryList}. ${activeLine}</replay_entries>`);
  }

  if (isPresent(snapshot.environmentsContext)) {
    const { all, selectedId, selectedName } = snapshot.environmentsContext;
    const truncatedAll = all.map((e) => ({
      id: e.id,
      name: truncateContextValue(e.name, ENVIRONMENT_NAME_CHARS),
    }));
    const envList = truncatedAll.map((e) => `- ${e.name} (id: ${e.id})`).join("\n");
    const truncatedEnvList = truncateContextValue(envList, ENVIRONMENTS_TOTAL_CHARS);
    const truncatedSelectedName =
      isPresent(selectedName) && selectedName !== ""
        ? truncateContextValue(selectedName, ENVIRONMENT_NAME_CHARS)
        : undefined;
    const selectedLine = isPresent(truncatedSelectedName)
      ? `Currently selected: ${truncatedSelectedName} (id: ${selectedId})`
      : "No environment selected";
    parts.push(`<environments>\n${truncatedEnvList}\n\n${selectedLine}\n</environments>`);
  }

  if (isPresent(snapshot.environmentVariables) && snapshot.environmentVariables.length > 0) {
    const previewEntries = snapshot.environmentVariables.map((variable) =>
      toEnvironmentVariablePreviewEntry(variable)
    );
    let envJson = JSON.stringify(previewEntries, null, 2);
    envJson = truncateContextValue(envJson, ENVIRONMENT_VARIABLES_CONTEXT_CHARS);
    parts.push(`<environment_variables>\n${envJson}\n</environment_variables>`);
  }

  if (parts.length === 0) {
    return "";
  }

  return `<context>\n${parts.join("\n\n")}\n</context>`;
}

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

function toLearningPreviewEntry(learning: LearningPreviewSnapshot) {
  return {
    index: learning.index,
    preview: truncateContextValue(learning.preview, LEARNING_VALUE_CHARS, {
      retrievalHint: `Use LearningRead with index ${learning.index} for the full entry.`,
    }),
    length: learning.length,
  };
}

function toEnvironmentVariablePreviewEntry(variable: EnvironmentVariablePreviewSnapshot) {
  return {
    name: variable.name,
    kind: variable.kind,
    valueLength: variable.valueLength,
    preview:
      variable.preview !== undefined
        ? truncateContextValue(variable.preview, ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS, {
            retrievalHint: `Use EnvironmentRead to inspect ${variable.name}.`,
          })
        : undefined,
  };
}
