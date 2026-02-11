import type { AgentMode, Model, Result } from "shared";

import type { SessionMessage, SessionModel, SessionUpdateResult } from "./store.model";

import type { Todo } from "@/agent/types";

function handleSetModel(model: SessionModel, newModel: Model | undefined): SessionModel {
  return {
    ...model,
    model: newModel,
  };
}

function handleAddTodo(
  model: SessionModel,
  id: string,
  content: string
): { model: SessionModel; result: Result<Todo> } {
  const todo: Todo = { id, content, completed: false };
  return {
    model: {
      ...model,
      todos: [...model.todos, todo],
    },
    result: { kind: "Ok", value: todo },
  };
}

function handleCompleteTodo(
  model: SessionModel,
  id: string
): { model: SessionModel; result: Result<Todo> } {
  const todo = model.todos.find((t) => t.id === id);
  if (!todo) {
    return {
      model,
      result: { kind: "Error", error: `Todo with id "${id}" not found` },
    };
  }
  if (todo.completed) {
    return {
      model,
      result: { kind: "Error", error: `Todo "${id}" is already completed` },
    };
  }
  const updatedTodo = { ...todo, completed: true };
  return {
    model: {
      ...model,
      todos: model.todos.map((t) => (t.id === id ? updatedTodo : t)),
    },
    result: { kind: "Ok", value: updatedTodo },
  };
}

function handleRemoveTodo(
  model: SessionModel,
  id: string
): { model: SessionModel; result: Result<Todo> } {
  const todo = model.todos.find((t) => t.id === id);
  if (!todo) {
    return {
      model,
      result: { kind: "Error", error: `Todo with id "${id}" not found` },
    };
  }
  return {
    model: {
      ...model,
      todos: model.todos.filter((t) => t.id !== id),
    },
    result: { kind: "Ok", value: todo },
  };
}

function handleClearTodos(model: SessionModel): SessionModel {
  return {
    ...model,
    todos: [],
  };
}

function handleAddToQueue(
  model: SessionModel,
  id: string,
  text: string,
  createdAt: number
): SessionModel {
  return {
    ...model,
    queuedMessages: [...model.queuedMessages, { id, text, createdAt }],
  };
}

function handleRemoveFromQueue(model: SessionModel, id: string): SessionModel {
  return {
    ...model,
    queuedMessages: model.queuedMessages.filter((msg) => msg.id !== id),
  };
}

function handleMoveToFrontOfQueue(model: SessionModel, id: string): SessionModel {
  const queue = model.queuedMessages;
  const index = queue.findIndex((msg) => msg.id === id);
  if (index <= 0) return model;

  const message = queue[index]!;
  return {
    ...model,
    queuedMessages: [message, ...queue.slice(0, index), ...queue.slice(index + 1)],
  };
}

function handleClearQueuedMessages(model: SessionModel): SessionModel {
  return {
    ...model,
    queuedMessages: [],
  };
}

function handleSetDraftMessage(model: SessionModel, value: string): SessionModel {
  return {
    ...model,
    draftMessage: value,
  };
}

function handleSetHttpRequest(model: SessionModel, value: string): SessionModel {
  return {
    ...model,
    httpRequest: value,
  };
}

function handleCreateSnapshot(model: SessionModel, messageId: string): SessionModel {
  const existingIndex = model.snapshots.findIndex((s) => s.messageId === messageId);
  if (existingIndex !== -1) {
    return model;
  }
  return {
    ...model,
    snapshots: [...model.snapshots, { messageId, httpRequest: model.httpRequest }],
  };
}

function handleRestoreSnapshot(
  model: SessionModel,
  messageId: string
): { model: SessionModel; result: Result<string> } {
  const snapshot = model.snapshots.find((s) => s.messageId === messageId);
  if (!snapshot) {
    return {
      model,
      result: { kind: "Error", error: `Snapshot for message "${messageId}" not found` },
    };
  }
  const snapshotIndex = model.snapshots.findIndex((s) => s.messageId === messageId);
  return {
    model: {
      ...model,
      httpRequest: snapshot.httpRequest,
      snapshots: model.snapshots.slice(0, snapshotIndex + 1),
    },
    result: { kind: "Ok", value: snapshot.httpRequest },
  };
}

function handleSetSelectedSkillIds(model: SessionModel, ids: string[]): SessionModel {
  return {
    ...model,
    selectedSkillIds: [...ids],
  };
}

function handleToggleSkill(model: SessionModel, id: string): SessionModel {
  const current = new Set(model.selectedSkillIds);
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  return {
    ...model,
    selectedSkillIds: Array.from(current),
  };
}

function handleSetMode(model: SessionModel, mode: AgentMode): SessionModel {
  return {
    ...model,
    mode,
  };
}

function handleSetCustomAgent(
  model: SessionModel,
  agentId: string,
  allowedWorkflowIds: string[] | undefined
): SessionModel {
  return {
    ...model,
    selectedCustomAgentId: agentId,
    allowedWorkflowIds,
  };
}

function handleClearCustomAgent(model: SessionModel): SessionModel {
  return {
    ...model,
    selectedCustomAgentId: undefined,
    allowedWorkflowIds: undefined,
  };
}

export function update(model: SessionModel, message: SessionMessage): SessionUpdateResult {
  switch (message.type) {
    case "SET_MODEL":
      return handleSetModel(model, message.model);

    case "ADD_TODO":
      return handleAddTodo(model, message.id, message.content);

    case "COMPLETE_TODO":
      return handleCompleteTodo(model, message.id);

    case "REMOVE_TODO":
      return handleRemoveTodo(model, message.id);

    case "CLEAR_TODOS":
      return handleClearTodos(model);

    case "ADD_TO_QUEUE":
      return handleAddToQueue(model, message.id, message.text, message.createdAt);

    case "REMOVE_FROM_QUEUE":
      return handleRemoveFromQueue(model, message.id);

    case "MOVE_TO_FRONT_OF_QUEUE":
      return handleMoveToFrontOfQueue(model, message.id);

    case "CLEAR_QUEUED_MESSAGES":
      return handleClearQueuedMessages(model);

    case "SET_DRAFT_MESSAGE":
      return handleSetDraftMessage(model, message.value);

    case "SET_HTTP_REQUEST":
      return handleSetHttpRequest(model, message.value);

    case "CREATE_SNAPSHOT":
      return handleCreateSnapshot(model, message.messageId);

    case "RESTORE_SNAPSHOT":
      return handleRestoreSnapshot(model, message.messageId);

    case "SET_SELECTED_SKILL_IDS":
      return handleSetSelectedSkillIds(model, message.ids);

    case "TOGGLE_SKILL":
      return handleToggleSkill(model, message.id);

    case "SET_MODE":
      return handleSetMode(model, message.mode);

    case "SET_CUSTOM_AGENT":
      return handleSetCustomAgent(model, message.agentId, message.allowedWorkflowIds);

    case "CLEAR_CUSTOM_AGENT":
      return handleClearCustomAgent(model);

    default:
      return model;
  }
}
