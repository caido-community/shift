import type { ChatStatus } from "ai";

import type { AgentSession } from "@/agent/session";

export type AgentIndicatorState = {
  hasMessages: boolean;
  status: ChatStatus;
};

export type AgentModel = {
  sessions: Map<string, AgentSession>;
  indicatorStates: Map<string, AgentIndicatorState>;
  persistedSessionIds: Set<string>;
  selectedSessionId: string | undefined;
  debugMode: boolean;
};

export type AgentMessage =
  | { type: "SELECT_SESSION"; sessionId: string }
  | { type: "CLEAR_SESSION_SELECTION" }
  | { type: "TOGGLE_DEBUG_MODE" }
  | { type: "ADD_SESSION"; sessionId: string; session: AgentSession }
  | { type: "REMOVE_SESSION"; sessionId: string }
  | { type: "SET_PERSISTED_SESSION_IDS"; sessionIds: string[] }
  | { type: "ADD_PERSISTED_SESSION_ID"; sessionId: string }
  | { type: "REMOVE_PERSISTED_SESSION_ID"; sessionId: string }
  | {
      type: "SET_SESSION_INDICATOR_STATE";
      sessionId: string;
      state: AgentIndicatorState;
    }
  | { type: "RESET" };

export function createInitialModel(): AgentModel {
  return {
    sessions: new Map(),
    indicatorStates: new Map(),
    persistedSessionIds: new Set(),
    selectedSessionId: undefined,
    debugMode: false,
  };
}
