import type { AgentMode, Model, Result } from "shared";

import type { QueuedMessage, Todo } from "@/agent/types";

export type Snapshot = {
  messageId: string;
  httpRequest: string;
};

export type SessionModel = {
  model: Model | undefined;
  todos: Todo[];
  queuedMessages: QueuedMessage[];
  draftMessage: string;
  httpRequest: string;
  snapshots: Snapshot[];
  selectedSkillIds: string[];
  selectedCustomAgentId: string | undefined;
  mode: AgentMode;
  allowedWorkflowIds: string[] | undefined;
};

export function createInitialModel(): SessionModel {
  return {
    model: undefined,
    todos: [],
    queuedMessages: [],
    draftMessage: "",
    httpRequest: "",
    snapshots: [],
    selectedSkillIds: [],
    selectedCustomAgentId: undefined,
    mode: "focus",
    allowedWorkflowIds: undefined,
  };
}

export type SessionMessage =
  | { type: "SET_MODEL"; model: Model | undefined }
  | { type: "ADD_TODO"; id: string; content: string }
  | { type: "COMPLETE_TODO"; id: string }
  | { type: "REMOVE_TODO"; id: string }
  | { type: "CLEAR_TODOS" }
  | { type: "ADD_TO_QUEUE"; id: string; text: string; createdAt: number }
  | { type: "REMOVE_FROM_QUEUE"; id: string }
  | { type: "MOVE_TO_FRONT_OF_QUEUE"; id: string }
  | { type: "CLEAR_QUEUED_MESSAGES" }
  | { type: "SET_DRAFT_MESSAGE"; value: string }
  | { type: "SET_HTTP_REQUEST"; value: string }
  | { type: "CREATE_SNAPSHOT"; messageId: string }
  | { type: "RESTORE_SNAPSHOT"; messageId: string }
  | { type: "SET_SELECTED_SKILL_IDS"; ids: string[] }
  | { type: "TOGGLE_SKILL"; id: string }
  | { type: "SET_MODE"; mode: AgentMode }
  | {
      type: "SET_CUSTOM_AGENT";
      agentId: string;
      allowedWorkflowIds: string[] | undefined;
    }
  | { type: "CLEAR_CUSTOM_AGENT" };

export type SessionUpdateResultWithValue<T> = { model: SessionModel; result: Result<T> };

export type SessionUpdateResult = SessionModel | SessionUpdateResultWithValue<unknown>;
