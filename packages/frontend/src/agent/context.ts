import type { EnvironmentVariable } from "@caido/sdk-frontend";
import type { UIMessageStreamWriter } from "ai";
import type {
  AgentMode,
  AgentSkill,
  Model,
  ResolvedCustomAgent,
  Result,
  ShiftMessage,
} from "shared";

import { truncateContextValue } from "@/agent/context.truncation";
import type { Todo } from "@/agent/types";
import { type SessionStore } from "@/stores/agent/session";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useLearningsStore } from "@/stores/learnings";
import { useSkillsStore } from "@/stores/skills";
import { type FrontendSDK } from "@/types";
import { writeToRequestEditor } from "@/utils/caido";
import { isPresent } from "@/utils/optional";

type EnvironmentInfo = {
  id: string;
  name: string;
};

type EnvironmentsContext = {
  all: EnvironmentInfo[];
  selectedId: string | undefined;
};

type EntriesContext = {
  activeEntryId: string | undefined;
  recentEntryIds: string[];
};

type ConvertWorkflowContext = {
  id: string;
  name: string;
  description: string;
};

const HTTP_REQUEST_CONTEXT_CHARS = 12_000;

export class AgentContext {
  private readonly _sdk: FrontendSDK;
  private readonly replaySessionId: string;
  private readonly store: SessionStore;
  private streamWriter: UIMessageStreamWriter<ShiftMessage> | undefined;
  private skillsGetter: () => AgentSkill[];
  private environmentsContext: EnvironmentsContext | undefined;
  private entriesContext: EntriesContext | undefined;

  constructor(sdk: FrontendSDK, replaySessionId: string, store: SessionStore) {
    this._sdk = sdk;
    this.replaySessionId = replaySessionId;
    this.store = store;

    const skillsStore = useSkillsStore();
    this.skillsGetter = () => skillsStore.skills;
  }

  get sdk(): FrontendSDK {
    return this._sdk;
  }

  get sessionId(): string {
    return this.replaySessionId;
  }

  get todos(): Todo[] {
    return this.store.todos;
  }

  get httpRequest(): string {
    return this.store.httpRequest;
  }

  get model(): Model | undefined {
    return this.store.model;
  }

  get resolvedAgent(): ResolvedCustomAgent | undefined {
    const agentId = this.store.selectedCustomAgentId;
    if (agentId === undefined) {
      return undefined;
    }

    const customAgentsStore = useCustomAgentsStore();
    return customAgentsStore.getAgentById(agentId);
  }

  get mode(): AgentMode {
    return this.store.mode;
  }

  get allowedWorkflowIds(): string[] | undefined {
    const agent = this.resolvedAgent;
    if (agent !== undefined) {
      return agent.allowedWorkflowIds;
    }

    return this.store.allowedWorkflowIds;
  }

  get allowedBinaryPaths(): string[] | undefined {
    const agent = this.resolvedAgent;
    if (agent !== undefined) {
      return agent.allowedBinaryPaths;
    }

    return undefined;
  }

  get selectedSkills(): AgentSkill[] {
    const agent = this.resolvedAgent;
    if (agent !== undefined) {
      return agent.skills;
    }

    const selectedIds = this.store.selectedSkillIds;
    if (selectedIds.length === 0) {
      return [];
    }

    const selectedSet = new Set(selectedIds);
    return this.skillsGetter().filter((skill) => selectedSet.has(skill.id));
  }

  get learnings(): string[] {
    return useLearningsStore().entries;
  }

  addTodo(content: string): Result<Todo> {
    return this.store.addTodo(content);
  }

  completeTodo(id: string): Result<Todo> {
    return this.store.completeTodo(id);
  }

  removeTodo(id: string): Result<Todo> {
    return this.store.removeTodo(id);
  }

  clearTodos(): void {
    this.store.clearTodos();
  }

  setHttpRequest(raw: string): void {
    this.store.setHttpRequest(raw);
    this.syncEditorIfViewing(raw);
  }

  private syncEditorIfViewing(raw: string): void {
    if (typeof location === "undefined") {
      return;
    }

    if (location.hash !== "#/replay") {
      return;
    }

    const currentSession = this.sdk.replay.getCurrentSession();
    if (isPresent(currentSession) && currentSession.id === this.replaySessionId) {
      writeToRequestEditor(raw);
    }
  }

  get writer(): UIMessageStreamWriter<ShiftMessage> | undefined {
    return this.streamWriter;
  }

  setWriter(writer: UIMessageStreamWriter<ShiftMessage>): void {
    this.streamWriter = writer;
  }

  get environmentVariables(): EnvironmentVariable[] {
    return this._sdk.env.getVars();
  }

  async fetchEnvironmentInfo(): Promise<void> {
    const environmentsResult = await this._sdk.graphql.environments();

    const all = environmentsResult.environments.map((env) => ({
      id: env.id,
      name: env.name,
    }));

    const selectedElement = document.querySelector<HTMLElement>("[data-environment-id]");
    const selectedId = selectedElement?.dataset.environmentId;

    this.environmentsContext = { all, selectedId };
  }

  async fetchEntriesInfo(): Promise<void> {
    const sessionResult = await this._sdk.graphql.replaySessionEntries({
      id: this.replaySessionId,
    });

    if (!isPresent(sessionResult.replaySession)) {
      this.entriesContext = { activeEntryId: undefined, recentEntryIds: [] };
      return;
    }

    const activeEntryId = sessionResult.replaySession.activeEntry?.id;
    const allEntryIds = sessionResult.replaySession.entries.edges.map((edge) => edge.node.id);
    const recentEntryIds = allEntryIds.slice(-10);

    this.entriesContext = { activeEntryId, recentEntryIds };
  }

  private getAgentInstructions(): string {
    const instructions = this.resolvedAgent?.instructions.trim();
    if (!isPresent(instructions)) {
      return "";
    }

    return instructions;
  }

  private getRestrictedConvertWorkflows(): ConvertWorkflowContext[] | undefined {
    const allowedIds = this.allowedWorkflowIds;
    if (allowedIds === undefined) {
      return undefined;
    }

    const allowedSet = new Set(allowedIds);
    return this.sdk.workflows
      .getWorkflows()
      .filter((workflow) => workflow.kind === "Convert" && allowedSet.has(workflow.id))
      .map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
      }));
  }

  toContextPrompt(): string {
    const parts: string[] = [];

    if (this.todos.length > 0) {
      const todoList = this.todos
        .map((t) => `- [${t.completed ? "completed" : "pending"}] (id: ${t.id}) ${t.content}`)
        .join("\n");
      parts.push(`<todos>\n${todoList}\n</todos>`);
    }

    if (this.learnings.length > 0) {
      const serializedLearnings = JSON.stringify(
        this.learnings.map((value, index) => ({ index, value })),
        null,
        2
      );
      parts.push(`<learnings>\n${serializedLearnings}\n</learnings>`);
    }

    if (this.httpRequest !== "") {
      const requestForPrompt = truncateContextValue(this.httpRequest, HTTP_REQUEST_CONTEXT_CHARS);
      parts.push(`<current_http_request>\n${requestForPrompt}\n</current_http_request>`);
    }

    const restrictedConvertWorkflows = this.getRestrictedConvertWorkflows();
    if (restrictedConvertWorkflows !== undefined) {
      const workflowList = JSON.stringify(restrictedConvertWorkflows, null, 2);
      parts.push(`<allowed_convert_workflows>\n${workflowList}\n</allowed_convert_workflows>`);
    }

    if (isPresent(this.resolvedAgent)) {
      const binaryList = JSON.stringify(this.allowedBinaryPaths ?? [], null, 2);
      parts.push(`<allowed_binaries>\n${binaryList}\n</allowed_binaries>`);
    }

    if (isPresent(this.entriesContext) && this.entriesContext.recentEntryIds.length > 0) {
      const { activeEntryId, recentEntryIds } = this.entriesContext;
      const entryList = recentEntryIds.map((id) => `- ${id}`).join("\n");
      const activeLine = isPresent(activeEntryId)
        ? `Active entry: ${activeEntryId}`
        : "No active entry";
      parts.push(`<replay_entries>\n${entryList}\n\n${activeLine}\n</replay_entries>`);
    }

    if (this.environmentsContext) {
      const { all, selectedId } = this.environmentsContext;
      const selectedName = isPresent(selectedId)
        ? (all.find((e) => e.id === selectedId)?.name ?? "Unknown")
        : undefined;

      const envList = all.map((e) => `- ${e.name} (id: ${e.id})`).join("\n");
      const selectedLine = isPresent(selectedName)
        ? `Currently selected: ${selectedName} (id: ${selectedId})`
        : "No environment selected";

      parts.push(`<environments>\n${envList}\n\n${selectedLine}\n</environments>`);
    }

    const envVars = this.environmentVariables;
    if (envVars.length > 0) {
      const envList = JSON.stringify(
        envVars.map((v) => ({
          name: v.name,
          value: v.isSecret ? "[SECRET]" : v.value,
        })),
        null,
        2
      );
      parts.push(`<environment_variables>\n${envList}\n</environment_variables>`);
    }

    if (parts.length === 0) {
      return "";
    }

    return `<context>\n${parts.join("\n\n")}\n</context>`;
  }

  toSkillsPrompt(): string {
    const skills = this.selectedSkills;
    const agentInstructions = this.getAgentInstructions();
    if (skills.length === 0 && agentInstructions === "") {
      return "";
    }

    const parts: string[] = [];
    if (agentInstructions !== "") {
      parts.push(`<agent_instructions>\n${agentInstructions}\n</agent_instructions>`);
    }

    if (skills.length > 0) {
      const skillEntries = skills
        .map((skill) => `<skill title="${skill.title}">\n${skill.content}\n</skill>`)
        .join("\n");
      parts.push(skillEntries);
    }

    return `<additional_instructions>\n${parts.join("\n")}\n</additional_instructions>`;
  }
}
