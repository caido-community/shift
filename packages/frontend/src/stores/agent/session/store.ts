import { defineStore } from "pinia";
import type { AgentMode, Model, ResolvedCustomAgent, Result } from "shared";
import { computed, readonly, shallowRef } from "vue";

import {
  createInitialModel,
  type SessionMessage,
  type SessionModel,
  type SessionUpdateResult,
  type SessionUpdateResultWithValue,
} from "./store.model";
import { update } from "./store.update";

import type { Todo } from "@/agent/types";
import { generateId } from "@/agent/utils/id";

function isResultUpdate<T>(result: SessionUpdateResult): result is SessionUpdateResultWithValue<T> {
  return typeof result === "object" && "result" in result && "model" in result;
}

function createSessionStore(sessionId: string) {
  return defineStore(`agent-session-${sessionId}`, () => {
    const model = shallowRef<SessionModel>(createInitialModel());

    function dispatch(message: SessionMessage): SessionUpdateResult {
      const result = update(model.value, message);
      if (isResultUpdate(result)) {
        model.value = result.model;
        return result;
      }
      model.value = result;
      return result;
    }

    const currentModel = computed(() => model.value.model);
    const todos = computed(() => model.value.todos);
    const queuedMessages = computed(() => model.value.queuedMessages);
    const draftMessage = computed(() => model.value.draftMessage);
    const httpRequest = computed(() => model.value.httpRequest);
    const snapshots = computed(() => model.value.snapshots);
    const selectedSkillIds = computed(() => model.value.selectedSkillIds);
    const selectedCustomAgentId = computed(() => model.value.selectedCustomAgentId);
    const mode = computed(() => model.value.mode);
    const allowedWorkflowIds = computed(() => model.value.allowedWorkflowIds);

    function addTodo(content: string): Result<Todo> {
      const id = generateId();
      const result = dispatch({ type: "ADD_TODO", id, content });
      if (isResultUpdate<Todo>(result)) {
        return result.result;
      }
      return { kind: "Error", error: "Unexpected dispatch result" };
    }

    function completeTodo(id: string): Result<Todo> {
      const result = dispatch({ type: "COMPLETE_TODO", id });
      if (isResultUpdate<Todo>(result)) {
        return result.result;
      }
      return { kind: "Error", error: "Unexpected dispatch result" };
    }

    function removeTodo(id: string): Result<Todo> {
      const result = dispatch({ type: "REMOVE_TODO", id });
      if (isResultUpdate<Todo>(result)) {
        return result.result;
      }
      return { kind: "Error", error: "Unexpected dispatch result" };
    }

    function clearTodos(): void {
      dispatch({ type: "CLEAR_TODOS" });
    }

    function addToQueue(text: string): void {
      dispatch({ type: "ADD_TO_QUEUE", id: generateId(), text, createdAt: Date.now() });
    }

    function removeFromQueue(id: string): void {
      dispatch({ type: "REMOVE_FROM_QUEUE", id });
    }

    function moveToFrontOfQueue(id: string): void {
      dispatch({ type: "MOVE_TO_FRONT_OF_QUEUE", id });
    }

    function clearQueuedMessages(): void {
      dispatch({ type: "CLEAR_QUEUED_MESSAGES" });
    }

    function setModel(value: Model | undefined): void {
      dispatch({ type: "SET_MODEL", model: value });
    }

    function setDraftMessage(value: string): void {
      dispatch({ type: "SET_DRAFT_MESSAGE", value });
    }

    function setHttpRequest(value: string): void {
      dispatch({ type: "SET_HTTP_REQUEST", value });
    }

    function createSnapshot(messageId: string): void {
      dispatch({ type: "CREATE_SNAPSHOT", messageId });
    }

    function restoreSnapshot(messageId: string): Result<string> {
      const result = dispatch({ type: "RESTORE_SNAPSHOT", messageId });
      if (isResultUpdate<string>(result)) {
        return result.result;
      }
      return { kind: "Error", error: "Unexpected dispatch result" };
    }

    function hasSnapshot(messageId: string): boolean {
      return model.value.snapshots.some((s) => s.messageId === messageId);
    }

    function setSelectedSkillIds(ids: string[]): void {
      dispatch({ type: "SET_SELECTED_SKILL_IDS", ids });
    }

    function toggleSkill(id: string): void {
      dispatch({ type: "TOGGLE_SKILL", id });
    }

    function isSkillSelected(id: string): boolean {
      return model.value.selectedSkillIds.includes(id);
    }

    function setMode(value: AgentMode): void {
      dispatch({ type: "SET_MODE", mode: value });
    }

    function setCustomAgent(agent: ResolvedCustomAgent): void {
      dispatch({
        type: "SET_CUSTOM_AGENT",
        agentId: agent.id,
        allowedWorkflowIds: agent.allowedWorkflowIds,
      });
    }

    function clearCustomAgent(): void {
      dispatch({ type: "CLEAR_CUSTOM_AGENT" });
    }

    return {
      state: readonly(model),
      model: currentModel,
      todos,
      queuedMessages,
      draftMessage,
      httpRequest,
      snapshots,
      dispatch,
      addTodo,
      completeTodo,
      removeTodo,
      clearTodos,
      addToQueue,
      removeFromQueue,
      moveToFrontOfQueue,
      clearQueuedMessages,
      setModel,
      setDraftMessage,
      setHttpRequest,
      createSnapshot,
      restoreSnapshot,
      hasSnapshot,
      selectedSkillIds,
      setSelectedSkillIds,
      toggleSkill,
      isSkillSelected,
      selectedCustomAgentId,
      mode,
      allowedWorkflowIds,
      setMode,
      setCustomAgent,
      clearCustomAgent,
    };
  })();
}

export type SessionStore = ReturnType<typeof createSessionStore>;

const sessionStores = new Map<string, SessionStore>();

export function useSessionStore(sessionId: string): SessionStore {
  const existing = sessionStores.get(sessionId);
  if (existing) {
    return existing;
  }

  const store = createSessionStore(sessionId);
  sessionStores.set(sessionId, store);
  return store;
}

export function removeSessionStore(sessionId: string): void {
  const store = sessionStores.get(sessionId);
  if (store) {
    store.$dispose();
  }
  sessionStores.delete(sessionId);
}
