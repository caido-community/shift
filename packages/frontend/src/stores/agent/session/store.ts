import type { AgentMode, Model, ResolvedCustomAgent, Result } from "shared";
import { computed, reactive, shallowRef } from "vue";

import type { QueuedMessage } from "@/agent/types";
import { generateId } from "@/agent/utils/id";
import type { ReasoningEffort } from "@/utils/ai";

type Snapshot = {
  messageId: string;
  httpRequest: string;
};

export function createSessionStore() {
  const model = shallowRef<Model | undefined>(undefined);
  const queuedMessages = shallowRef<QueuedMessage[]>([]);
  const draftMessage = shallowRef("");
  const httpRequest = shallowRef("");
  const snapshots = shallowRef<Snapshot[]>([]);
  const selectedSkillIds = shallowRef<string[]>([]);
  const selectedCustomAgentId = shallowRef<string | undefined>(undefined);
  const mode = shallowRef<AgentMode>("focus");
  const allowedWorkflowIds = shallowRef<string[] | undefined>(undefined);
  const reasoningEffort = shallowRef<ReasoningEffort>("low");

  function addToQueue(text: string): void {
    queuedMessages.value = [
      ...queuedMessages.value,
      { id: generateId(), text, createdAt: Date.now() },
    ];
  }

  function removeFromQueue(id: string): void {
    queuedMessages.value = queuedMessages.value.filter((msg) => msg.id !== id);
  }

  function moveToFrontOfQueue(id: string): void {
    const queue = queuedMessages.value;
    const index = queue.findIndex((msg) => msg.id === id);
    if (index <= 0) return;

    queuedMessages.value = [queue[index]!, ...queue.slice(0, index), ...queue.slice(index + 1)];
  }

  function clearQueuedMessages(): void {
    queuedMessages.value = [];
  }

  function setModel(value: Model | undefined): void {
    model.value = value;
  }

  function setDraftMessage(value: string): void {
    draftMessage.value = value;
  }

  function setHttpRequest(value: string): void {
    httpRequest.value = value;
  }

  function createSnapshot(messageId: string): void {
    if (hasSnapshot(messageId)) return;
    snapshots.value = [...snapshots.value, { messageId, httpRequest: httpRequest.value }];
  }

  function restoreSnapshot(messageId: string): Result<string> {
    const index = snapshots.value.findIndex((s) => s.messageId === messageId);
    const snapshot = snapshots.value[index];
    if (!snapshot) {
      return { kind: "Error", error: `Snapshot for message "${messageId}" not found` };
    }

    httpRequest.value = snapshot.httpRequest;
    snapshots.value = snapshots.value.slice(0, index + 1);
    return { kind: "Ok", value: snapshot.httpRequest };
  }

  function clearSnapshots(): void {
    snapshots.value = [];
  }

  function hasSnapshot(messageId: string): boolean {
    return snapshots.value.some((s) => s.messageId === messageId);
  }

  function setSelectedSkillIds(ids: string[]): void {
    selectedSkillIds.value = [...ids];
  }

  function toggleSkill(id: string): void {
    const current = new Set(selectedSkillIds.value);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    selectedSkillIds.value = Array.from(current);
  }

  function isSkillSelected(id: string): boolean {
    return selectedSkillIds.value.includes(id);
  }

  function setMode(value: AgentMode): void {
    mode.value = value;
  }

  function setReasoningEffort(value: ReasoningEffort): void {
    reasoningEffort.value = value;
  }

  function setCustomAgent(agent: Pick<ResolvedCustomAgent, "id" | "allowedWorkflowIds">): void {
    selectedCustomAgentId.value = agent.id;
    allowedWorkflowIds.value = agent.allowedWorkflowIds;
  }

  function clearCustomAgent(): void {
    selectedCustomAgentId.value = undefined;
    allowedWorkflowIds.value = undefined;
  }

  return reactive({
    model: computed(() => model.value),
    queuedMessages: computed(() => queuedMessages.value),
    draftMessage: computed(() => draftMessage.value),
    httpRequest: computed(() => httpRequest.value),
    snapshots: computed(() => snapshots.value),
    selectedSkillIds: computed(() => selectedSkillIds.value),
    selectedCustomAgentId: computed(() => selectedCustomAgentId.value),
    mode: computed(() => mode.value),
    allowedWorkflowIds: computed(() => allowedWorkflowIds.value),
    reasoningEffort: computed(() => reasoningEffort.value),
    addToQueue,
    removeFromQueue,
    moveToFrontOfQueue,
    clearQueuedMessages,
    setModel,
    setDraftMessage,
    setHttpRequest,
    createSnapshot,
    restoreSnapshot,
    clearSnapshots,
    hasSnapshot,
    setSelectedSkillIds,
    toggleSkill,
    isSkillSelected,
    setMode,
    setReasoningEffort,
    setCustomAgent,
    clearCustomAgent,
  });
}

export type SessionStore = ReturnType<typeof createSessionStore>;
