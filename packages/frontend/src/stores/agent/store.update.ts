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
      const newIndicatorStates = new Map(model.indicatorStates);
      newIndicatorStates.delete(message.sessionId);
      return {
        ...model,
        sessions: newSessions,
        indicatorStates: newIndicatorStates,
        persistedSessionIds: newPersistedIds,
      };
    }

    case "SET_PERSISTED_SESSION_IDS": {
      const nextPersistedIds = new Set(message.sessionIds);
      const persistedUnchanged =
        nextPersistedIds.size === model.persistedSessionIds.size &&
        message.sessionIds.every((sessionId) => model.persistedSessionIds.has(sessionId));
      const nextIndicatorStates = new Map(model.indicatorStates);

      for (const sessionId of nextPersistedIds) {
        const previous = nextIndicatorStates.get(sessionId);
        if (previous === undefined) {
          nextIndicatorStates.set(sessionId, {
            hasMessages: true,
            status: "ready",
          });
          continue;
        }

        if (!previous.hasMessages) {
          nextIndicatorStates.set(sessionId, {
            ...previous,
            hasMessages: true,
          });
        }
      }

      const indicatorStatesChanged = mapsDiffer(model.indicatorStates, nextIndicatorStates);
      if (persistedUnchanged && !indicatorStatesChanged) {
        return model;
      }

      return {
        ...model,
        indicatorStates: nextIndicatorStates,
        persistedSessionIds: nextPersistedIds,
      };
    }

    case "ADD_PERSISTED_SESSION_ID": {
      if (model.persistedSessionIds.has(message.sessionId)) {
        const previous = model.indicatorStates.get(message.sessionId);
        if (previous?.hasMessages === true) {
          return model;
        }
      }

      const newPersistedIds = new Set(model.persistedSessionIds);
      newPersistedIds.add(message.sessionId);
      const newIndicatorStates = new Map(model.indicatorStates);
      const previous = newIndicatorStates.get(message.sessionId);
      newIndicatorStates.set(message.sessionId, {
        hasMessages: true,
        status: previous?.status ?? "ready",
      });

      return {
        ...model,
        indicatorStates: newIndicatorStates,
        persistedSessionIds: newPersistedIds,
      };
    }

    case "REMOVE_PERSISTED_SESSION_ID": {
      const hasPersistedId = model.persistedSessionIds.has(message.sessionId);
      const previous = model.indicatorStates.get(message.sessionId);
      if (!hasPersistedId && previous?.hasMessages !== true) {
        return model;
      }

      const newPersistedIds = new Set(model.persistedSessionIds);
      newPersistedIds.delete(message.sessionId);
      const newIndicatorStates = new Map(model.indicatorStates);

      if (model.sessions.has(message.sessionId)) {
        if (previous !== undefined) {
          newIndicatorStates.set(message.sessionId, {
            ...previous,
            hasMessages: false,
          });
        } else {
          newIndicatorStates.set(message.sessionId, {
            hasMessages: false,
            status: "ready",
          });
        }
      } else {
        newIndicatorStates.delete(message.sessionId);
      }

      return {
        ...model,
        indicatorStates: newIndicatorStates,
        persistedSessionIds: newPersistedIds,
      };
    }

    case "SET_SESSION_INDICATOR_STATE": {
      const previous = model.indicatorStates.get(message.sessionId);
      if (
        previous !== undefined &&
        previous.hasMessages === message.state.hasMessages &&
        previous.status === message.state.status
      ) {
        return model;
      }

      const nextIndicatorStates = new Map(model.indicatorStates);
      nextIndicatorStates.set(message.sessionId, message.state);

      return {
        ...model,
        indicatorStates: nextIndicatorStates,
      };
    }

    case "RESET":
      return createInitialModel();

    default:
      return model;
  }
}

function mapsDiffer<K, V>(left: Map<K, V>, right: Map<K, V>): boolean {
  if (left.size !== right.size) {
    return true;
  }

  for (const [key, value] of left) {
    if (!right.has(key) || right.get(key) !== value) {
      return true;
    }
  }

  return false;
}
