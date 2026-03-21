import type { EnvironmentVariable } from "@caido/sdk-frontend";
import type { UIMessageStreamWriter } from "ai";
import type {
  AgentMode,
  AgentSkill,
  CustomAgentBinary,
  Model,
  ResolvedCustomAgent,
  Result,
  ShiftMessage,
} from "shared";

import {
  buildContextPrompt,
  buildSkillsPrompt,
  type ContextPromptSnapshot,
  ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS,
  ENVIRONMENT_VARIABLES_CONTEXT_CHARS,
  type SkillsPromptSnapshot,
} from "@/agent/context.prompt";
import { truncateContextValue } from "@/agent/context.truncation";
import type { Todo } from "@/agent/types";
import { type SessionStore } from "@/stores/agent/session";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useLearningsStore } from "@/stores/learnings";
import { useSkillsStore } from "@/stores/skills";
import { type FrontendSDK } from "@/types";
import { writeToRequestEditor } from "@/utils/caido";
import { isPresent } from "@/utils/optional";
import { truncate } from "@/utils/text";

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

const PAYLOAD_BLOB_MAX_COUNT = 40;
const PAYLOAD_BLOB_MAX_BYTES = 1_000_000;
const PAYLOAD_BLOB_PREVIEW_CHARS = 200;

type PayloadBlobMetadata = {
  blobId: string;
  reason: string;
  length: number;
  preview: string;
};

type EnvironmentVariablePromptEntry = {
  name: string;
  value: string;
  valueLength?: number;
};

export class AgentContext {
  private readonly _sdk: FrontendSDK;
  private readonly replaySessionId: string;
  private readonly store: SessionStore;
  private readonly payloadBlobs = new Map<string, { content: string; reason: string }>();
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

  get allowedBinaries(): CustomAgentBinary[] | undefined {
    const agent = this.resolvedAgent;
    if (agent !== undefined) {
      return agent.allowedBinaries;
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
      return this.skillsGetter();
    }

    const selectedSet = new Set(selectedIds);
    return this.skillsGetter().filter((skill) => selectedSet.has(skill.id));
  }

  getSkillById(skillId: string): AgentSkill | undefined {
    return this.selectedSkills.find((s) => s.id === skillId);
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

  createPayloadBlob(content: string, reason: string): PayloadBlobMetadata {
    if (this.payloadBlobs.size >= PAYLOAD_BLOB_MAX_COUNT) {
      const oldest = this.payloadBlobs.keys().next().value;
      if (oldest !== undefined) {
        this.payloadBlobs.delete(oldest);
      }
    }

    const bytes = new TextEncoder().encode(content).length;
    if (bytes > PAYLOAD_BLOB_MAX_BYTES) {
      throw new Error(
        `Payload blob is ${bytes} bytes, exceeding the ${PAYLOAD_BLOB_MAX_BYTES}-byte limit. Generate a smaller payload or split it into multiple blobs.`
      );
    }

    let blobId = "";
    do {
      blobId = `blob-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    } while (this.payloadBlobs.has(blobId));

    this.payloadBlobs.set(blobId, { content, reason });
    return {
      blobId,
      reason,
      length: content.length,
      preview: truncate(content, PAYLOAD_BLOB_PREVIEW_CHARS),
    };
  }

  getPayloadBlob(blobId: string): string | undefined {
    return this.payloadBlobs.get(blobId)?.content;
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

  private getEnvironmentVariablesPrompt(): string | undefined {
    const envVars = this.environmentVariables;
    if (envVars.length === 0) {
      return undefined;
    }

    const serialized = JSON.stringify(
      envVars.map((variable): EnvironmentVariablePromptEntry => {
        if (variable.isSecret) {
          return { name: variable.name, value: "[SECRET]" };
        }

        if (variable.value.length <= ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS) {
          return { name: variable.name, value: variable.value };
        }

        return {
          name: variable.name,
          value: truncateContextValue(variable.value, ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS),
          valueLength: variable.value.length,
        };
      }),
      null,
      2
    );

    return truncateContextValue(serialized, ENVIRONMENT_VARIABLES_CONTEXT_CHARS);
  }

  toContextPrompt(): string {
    const snapshot = this.buildContextSnapshot();
    return buildContextPrompt(snapshot);
  }

  private buildContextSnapshot(): ContextPromptSnapshot {
    const snapshot: ContextPromptSnapshot = {};

    if (this.todos.length > 0) {
      snapshot.todos = this.todos.map((t) => ({
        id: t.id,
        content: t.content,
        completed: t.completed,
      }));
    }

    if (this.learnings.length > 0) {
      snapshot.learnings = [...this.learnings];
    }

    if (this.httpRequest !== "") {
      snapshot.httpRequest = this.httpRequest;
    }

    const restrictedConvertWorkflows = this.getRestrictedConvertWorkflows();
    if (restrictedConvertWorkflows !== undefined) {
      snapshot.allowedConvertWorkflows = restrictedConvertWorkflows;
    }

    if (isPresent(this.resolvedAgent)) {
      snapshot.allowedBinaries = (this.allowedBinaries ?? []).map((binary) => ({
        path: binary.path,
        instructions:
          binary.instructions !== undefined && binary.instructions.trim() !== ""
            ? binary.instructions
            : undefined,
      }));
    }

    if (isPresent(this.entriesContext) && this.entriesContext.recentEntryIds.length > 0) {
      snapshot.entriesContext = this.entriesContext;
    }

    if (this.environmentsContext !== undefined) {
      const { all, selectedId } = this.environmentsContext;
      const selectedName = isPresent(selectedId)
        ? (all.find((e) => e.id === selectedId)?.name ?? "Unknown")
        : undefined;
      snapshot.environmentsContext = {
        all,
        selectedId,
        selectedName,
      };
    }

    const environmentVariablesJson = this.getEnvironmentVariablesPrompt();
    if (environmentVariablesJson !== undefined) {
      snapshot.environmentVariablesJson = environmentVariablesJson;
    }

    return snapshot;
  }

  toSkillsPrompt(): string {
    const snapshot = this.buildSkillsSnapshot();
    return buildSkillsPrompt(snapshot);
  }

  private buildSkillsSnapshot(): SkillsPromptSnapshot {
    const agentInstructions = this.getAgentInstructions();
    const skills = this.selectedSkills;

    if (skills.length === 0 && agentInstructions === "") {
      return {};
    }

    const snapshot: SkillsPromptSnapshot = {};
    if (agentInstructions !== "") {
      snapshot.agentInstructions = agentInstructions;
    }
    if (skills.length > 0) {
      snapshot.skills = skills.map((s) => {
        const isAlwaysAttached = s.attachMode === "always";
        if (isAlwaysAttached) {
          return { kind: "always-attached" as const, id: s.id, title: s.title, content: s.content };
        }
        return {
          kind: "on-demand" as const,
          id: s.id,
          title: s.title,
          description: s.description,
        };
      });
    }
    return snapshot;
  }
}
