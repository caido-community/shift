import { truncateContextValue } from "@/agent/context.truncation";
import type { ContextPromptSnapshot, SkillsPromptSnapshot } from "@/agent/context.prompt.types";
import { truncate } from "@/utils/text";

export {
  type ContextPromptSnapshot,
  type SkillsPromptSnapshot,
} from "@/agent/context.prompt.types";

export const HTTP_REQUEST_CONTEXT_CHARS = 12_000;
export const ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS = 400;
export const ENVIRONMENT_VARIABLES_CONTEXT_CHARS = 8_000;
export const PAYLOAD_BLOB_PREVIEW_CHARS = 80;
export const TODO_CONTENT_CHARS = 500;
export const LEARNING_VALUE_CHARS = 1_000;
export const LEARNINGS_TOTAL_CHARS = 12_000;
export const SKILL_CONTENT_CHARS = 8_000;
export const AGENT_INSTRUCTIONS_CHARS = 16_000;
export const WORKFLOW_NAME_CHARS = 200;
export const WORKFLOW_DESCRIPTION_CHARS = 500;
export const WORKFLOWS_TOTAL_CHARS = 6_000;
export const BINARY_PATH_CHARS = 256;
export const BINARY_INSTRUCTIONS_CHARS = 1_000;
export const BINARIES_TOTAL_CHARS = 4_000;
export const ENVIRONMENT_NAME_CHARS = 100;
export const ENVIRONMENTS_TOTAL_CHARS = 2_000;
export const PAYLOAD_BLOBS_TOTAL_CHARS = 6_000;

export function buildContextPrompt(snapshot: ContextPromptSnapshot): string {
  const parts: string[] = [];

  if (snapshot.todos !== undefined && snapshot.todos.length > 0) {
    const todoList = snapshot.todos
      .map((t) => {
        const content = truncateContextValue(t.content, TODO_CONTENT_CHARS);
        return `- [${t.completed ? "completed" : "pending"}] (id: ${t.id}) ${content}`;
      })
      .join("\n");
    parts.push(`<todos>\n${todoList}\n</todos>`);
  }

  if (snapshot.payloadBlobs !== undefined && snapshot.payloadBlobs.length > 0) {
    const truncatedBlobs = snapshot.payloadBlobs.map((b) => ({
      blobId: b.blobId,
      reason: b.reason,
      length: b.length,
      preview: truncate(b.preview, PAYLOAD_BLOB_PREVIEW_CHARS),
    }));
    let blobList = JSON.stringify(truncatedBlobs, null, 2);
    blobList = truncateContextValue(blobList, PAYLOAD_BLOBS_TOTAL_CHARS);
    parts.push(`<payload_blobs>\n${blobList}\n</payload_blobs>`);
  }

  if (snapshot.learnings !== undefined && snapshot.learnings.length > 0) {
    const truncatedLearnings = snapshot.learnings.map((value, index) => ({
      index,
      value: truncateContextValue(value, LEARNING_VALUE_CHARS),
    }));
    let serialized = JSON.stringify(truncatedLearnings, null, 2);
    serialized = truncateContextValue(serialized, LEARNINGS_TOTAL_CHARS);
    parts.push(`<learnings>\n${serialized}\n</learnings>`);
  }

  if (snapshot.httpRequest !== undefined && snapshot.httpRequest !== "") {
    const requestForPrompt = truncateContextValue(
      snapshot.httpRequest,
      HTTP_REQUEST_CONTEXT_CHARS
    );
    parts.push(`<current_http_request>\n${requestForPrompt}\n</current_http_request>`);
  }

  if (
    snapshot.allowedConvertWorkflows !== undefined &&
    snapshot.allowedConvertWorkflows.length > 0
  ) {
    const truncatedWorkflows = snapshot.allowedConvertWorkflows.map((w) => ({
      id: w.id,
      name: truncateContextValue(w.name, WORKFLOW_NAME_CHARS),
      description: truncateContextValue(w.description, WORKFLOW_DESCRIPTION_CHARS),
    }));
    let workflowList = JSON.stringify(truncatedWorkflows, null, 2);
    workflowList = truncateContextValue(workflowList, WORKFLOWS_TOTAL_CHARS);
    parts.push(`<allowed_convert_workflows>\n${workflowList}\n</allowed_convert_workflows>`);
  }

  if (snapshot.allowedBinaries !== undefined) {
    const truncatedBinaries = snapshot.allowedBinaries.map((b) => ({
      path: truncateContextValue(b.path, BINARY_PATH_CHARS),
      instructions:
        b.instructions !== undefined && b.instructions.trim() !== ""
          ? truncateContextValue(b.instructions, BINARY_INSTRUCTIONS_CHARS)
          : undefined,
    }));
    let binaryList = JSON.stringify(truncatedBinaries, null, 2);
    binaryList = truncateContextValue(binaryList, BINARIES_TOTAL_CHARS);
    parts.push(`<allowed_binaries>\n${binaryList}\n</allowed_binaries>`);
  }

  if (
    snapshot.entriesContext !== undefined &&
    snapshot.entriesContext.recentEntryIds.length > 0
  ) {
    const { activeEntryId, recentEntryIds } = snapshot.entriesContext;
    const entryList = recentEntryIds.map((id) => `- ${id}`).join("\n");
    const activeLine =
      activeEntryId !== undefined && activeEntryId !== ""
        ? `Active entry: ${activeEntryId}`
        : "No active entry";
    parts.push(`<replay_entries>\n${entryList}\n\n${activeLine}\n</replay_entries>`);
  }

  if (snapshot.environmentsContext !== undefined) {
    const { all, selectedId, selectedName } = snapshot.environmentsContext;
    const truncatedAll = all.map((e) => ({
      id: e.id,
      name: truncateContextValue(e.name, ENVIRONMENT_NAME_CHARS),
    }));
    const envList = truncatedAll.map((e) => `- ${e.name} (id: ${e.id})`).join("\n");
    const truncatedEnvList = truncateContextValue(envList, ENVIRONMENTS_TOTAL_CHARS);
    const truncatedSelectedName =
      selectedName !== undefined && selectedName !== ""
        ? truncateContextValue(selectedName, ENVIRONMENT_NAME_CHARS)
        : undefined;
    const selectedLine =
      truncatedSelectedName !== undefined
        ? `Currently selected: ${truncatedSelectedName} (id: ${selectedId})`
        : "No environment selected";
    parts.push(`<environments>\n${truncatedEnvList}\n\n${selectedLine}\n</environments>`);
  }

  if (snapshot.environmentVariablesJson !== undefined) {
    const envJson = truncateContextValue(
      snapshot.environmentVariablesJson,
      ENVIRONMENT_VARIABLES_CONTEXT_CHARS
    );
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
    const skillEntries = skills
      .map((skill) => {
        const content = truncateContextValue(skill.content, SKILL_CONTENT_CHARS);
        return `<skill title="${skill.title}">\n${content}\n</skill>`;
      })
      .join("\n");
    parts.push(skillEntries);
  }

  return `<additional_instructions>\n${parts.join("\n")}\n</additional_instructions>`;
}
