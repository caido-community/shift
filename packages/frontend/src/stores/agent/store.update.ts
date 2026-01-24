import { type AgentMessage, type AgentModel, createInitialModel } from "./store.model";

export function update(model: AgentModel, message: AgentMessage): AgentModel {
  switch (message.type) {
    case "SELECT_SESSION":
      return {
        ...model,
        selectedSessionId: message.sessionId,
      };

    case "CLEAR_SESSION_SELECTION":
      return {
        ...model,
        selectedSessionId: undefined,
      };

    case "TOGGLE_DEBUG_MODE":
      return {
        ...model,
        debugMode: !model.debugMode,
      };

    case "ADD_SESSION": {
      const newSessions = new Map(model.sessions);
      newSessions.set(message.sessionId, message.session);
      return {
        ...model,
        sessions: newSessions,
      };
    }

    case "REMOVE_SESSION": {
      const newSessions = new Map(model.sessions);
      newSessions.delete(message.sessionId);
      const newPersistedIds = new Set(model.persistedSessionIds);
      newPersistedIds.delete(message.sessionId);
      return {
        ...model,
        sessions: newSessions,
        persistedSessionIds: newPersistedIds,
      };
    }

    case "SET_PERSISTED_SESSION_IDS":
      return {
        ...model,
        persistedSessionIds: new Set(message.sessionIds),
      };

    case "ADD_PERSISTED_SESSION_ID": {
      const newPersistedIds = new Set(model.persistedSessionIds);
      newPersistedIds.add(message.sessionId);
      return {
        ...model,
        persistedSessionIds: newPersistedIds,
      };
    }

    case "REMOVE_PERSISTED_SESSION_ID": {
      const newPersistedIds = new Set(model.persistedSessionIds);
      newPersistedIds.delete(message.sessionId);
      return {
        ...model,
        persistedSessionIds: newPersistedIds,
      };
    }

    case "RESET":
      return createInitialModel();

    default:
      return model;
  }
}
