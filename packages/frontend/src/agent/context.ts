import type { UIMessageStreamWriter } from "ai";
import type {
  AgentMode,
  AgentSkill,
  CustomAgentBinary,
  ResolvedCustomAgent,
  ShiftMessage,
} from "shared";

import {
  buildSkillsPrompt,
  type ContextPromptSnapshot,
  ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS,
  type EnvironmentVariablePreviewSnapshot,
  LEARNING_VALUE_CHARS,
  type LearningPreviewSnapshot,
  type SkillsPromptSnapshot,
} from "@/agent/context.prompt";
import type { EnvironmentInfoSnapshot } from "@/agent/context.prompt.types";
import { truncateContextValue } from "@/agent/context.truncation";
import { BUILT_IN_SKILLS } from "@/agent/skills";
import { type SessionStore } from "@/stores/agent/session";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useLearningsStore } from "@/stores/learnings";
import { useSkillsStore } from "@/stores/skills";
import { type FrontendSDK } from "@/types";
import { writeToRequestEditor } from "@/utils/caido";
import { isPresent } from "@/utils/optional";
import { truncate } from "@/utils/text";

type EnvironmentsContext = {
  all: EnvironmentInfoSnapshot[];
  selectedId: string | undefined;
};

type EntriesContext = {
  activeEntryId: string | undefined;
  recentEntryIds: string[];
  connection?: { host: string; port: number; isTLS: boolean; SNI?: string };
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

export class AgentContext {
  readonly sdk: FrontendSDK;
  readonly sessionId: string;
  readonly store: SessionStore;
  writer: UIMessageStreamWriter<ShiftMessage> | undefined;
  private readonly payloadBlobs = new Map<string, { content: string; reason: string }>();
  private readonly historicalToolOutputs = new Map<string, string>();
  private environmentsContext: EnvironmentsContext | undefined;
  private entriesContext: EntriesContext | undefined;

  constructor(sdk: FrontendSDK, sessionId: string, store: SessionStore) {
    this.sdk = sdk;
    this.sessionId = sessionId;
    this.store = store;
  }

  get httpRequest(): string {
    return this.store.httpRequest;
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

  private get allowedBinaries(): CustomAgentBinary[] | undefined {
    return this.resolvedAgent?.allowedBinaries;
  }

  get selectedSkills(): AgentSkill[] {
    const agent = this.resolvedAgent;
    if (agent !== undefined) {
      return agent.skills;
    }

    const { skills } = useSkillsStore();
    const selectedIds = this.store.selectedSkillIds;
    if (selectedIds.length === 0) {
      return skills;
    }

    const selectedSet = new Set(selectedIds);
    return skills.filter((skill) => selectedSet.has(skill.id));
  }

  get availableSkills(): AgentSkill[] {
    const builtInIds = new Set(BUILT_IN_SKILLS.map((skill) => skill.id));
    return [
      ...BUILT_IN_SKILLS,
      ...this.selectedSkills.filter((skill) => !builtInIds.has(skill.id)),
    ];
  }

  getSkillById(skillId: string): AgentSkill | undefined {
    return this.availableSkills.find((skill) => skill.id === skillId);
  }

  get selectedEnvironmentId(): string | undefined {
    return this.environmentsContext?.selectedId;
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
    if (isPresent(currentSession) && currentSession.id === this.sessionId) {
      writeToRequestEditor(raw);
    }
  }

  createPayloadBlob(content: string, reason: string): PayloadBlobMetadata {
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > PAYLOAD_BLOB_MAX_BYTES) {
      throw new Error(
        `Payload blob is ${bytes} bytes, exceeding the ${PAYLOAD_BLOB_MAX_BYTES}-byte limit. Generate a smaller payload or split it into multiple blobs.`
      );
    }

    if (this.payloadBlobs.size >= PAYLOAD_BLOB_MAX_COUNT) {
      const oldest = this.payloadBlobs.keys().next().value;
      if (oldest !== undefined) {
        this.payloadBlobs.delete(oldest);
      }
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

  registerHistoricalToolOutput(toolCallId: string, content: string): { blobId: string } {
    const blobId = `tool-${toolCallId}`;
    this.historicalToolOutputs.set(blobId, content);
    return { blobId };
  }

  getPayloadBlob(blobId: string): string | undefined {
    return this.payloadBlobs.get(blobId)?.content ?? this.historicalToolOutputs.get(blobId);
  }

  clearPayloadBlobs(): void {
    this.payloadBlobs.clear();
    this.historicalToolOutputs.clear();
  }

  // Reset first so a failed fetch leaves the snapshot without stale data.
  async fetchEnvironmentInfo(): Promise<void> {
    this.environmentsContext = undefined;
    const environmentsResult = await this.sdk.graphql.environments();

    const all = environmentsResult.environments.map((env) => ({
      id: env.id,
      name: env.name,
    }));
    all.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const selectedElement = document.querySelector<HTMLElement>("[data-environment-id]");
    const selectedId = selectedElement?.dataset.environmentId;

    this.environmentsContext = { all, selectedId };
  }

  async fetchEntriesInfo(): Promise<void> {
    this.entriesContext = undefined;
    const sessionResult = await this.sdk.graphql.replaySessionEntries({
      id: this.sessionId,
    });

    if (!isPresent(sessionResult.replaySession)) {
      this.entriesContext = { activeEntryId: undefined, recentEntryIds: [] };
      return;
    }

    const activeEntry = sessionResult.replaySession.activeEntry;
    const allEntryIds = sessionResult.replaySession.entries.edges.map((edge) => edge.node.id);
    const recentEntryIds = allEntryIds.slice(-10);
    const connection =
      activeEntry?.__typename === "ReplayEntryHttp"
        ? (activeEntry.draft?.connection ?? activeEntry.connection)
        : undefined;

    this.entriesContext = {
      activeEntryId: activeEntry?.id,
      recentEntryIds,
      connection: isPresent(connection)
        ? {
            host: connection.host,
            port: connection.port,
            isTLS: connection.isTLS,
            SNI: connection.SNI ?? undefined,
          }
        : undefined,
    };
  }

  private getAgentInstructions(): string {
    return this.resolvedAgent?.instructions.trim() ?? "";
  }

  private getEnvironmentVariablesSnapshot(): EnvironmentVariablePreviewSnapshot[] | undefined {
    const envVars = this.sdk.env.getVars();
    if (envVars.length === 0) {
      return undefined;
    }

    return [...envVars]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((variable): EnvironmentVariablePreviewSnapshot => {
        if (variable.isSecret) {
          return {
            name: variable.name,
            kind: "SECRET",
            valueLength: variable.value.length,
          };
        }

        const preview =
          variable.value.length <= ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS
            ? variable.value
            : truncateContextValue(variable.value, ENVIRONMENT_VARIABLE_VALUE_CONTEXT_CHARS, {
                retrievalHint: `Use EnvironmentRead to inspect ${variable.name}.`,
              });

        return {
          name: variable.name,
          kind: "PLAIN",
          preview,
          valueLength: variable.value.length,
        };
      });
  }

  private getLearningsSnapshot(): LearningPreviewSnapshot[] | undefined {
    const learnings = useLearningsStore().entries;
    if (learnings.length === 0) {
      return undefined;
    }

    return learnings.map((value, index) => ({
      index,
      preview:
        value.length <= LEARNING_VALUE_CHARS
          ? value
          : truncateContextValue(value, LEARNING_VALUE_CHARS, {
              retrievalHint: `Use LearningRead with index ${index} for the full entry.`,
            }),
      length: value.length,
    }));
  }

  toContextSnapshot(): ContextPromptSnapshot {
    const snapshot: ContextPromptSnapshot = {};

    const learningsSnapshot = this.getLearningsSnapshot();
    if (learningsSnapshot !== undefined) {
      snapshot.learnings = learningsSnapshot;
    }

    if (this.httpRequest !== "") {
      snapshot.httpRequest = this.httpRequest;
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

    const environmentVariables = this.getEnvironmentVariablesSnapshot();
    if (environmentVariables !== undefined) {
      snapshot.environmentVariables = environmentVariables;
    }

    return snapshot;
  }

  toSkillsPrompt(): string {
    const snapshot = this.buildSkillsSnapshot();
    return buildSkillsPrompt(snapshot);
  }

  private buildSkillsSnapshot(): SkillsPromptSnapshot {
    const agentInstructions = this.getAgentInstructions();
    const skills = this.availableSkills;
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
