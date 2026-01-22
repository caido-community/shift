import type { AgentSession } from "@/agent/session";

export type AgentModel = {
  sessions: Map<string, AgentSession>;
  selectedSessionId: string | undefined;
  debugMode: boolean;
};

export type AgentMessage =
  | { type: "SELECT_SESSION"; sessionId: string }
  | { type: "CLEAR_SESSION_SELECTION" }
  | { type: "TOGGLE_DEBUG_MODE" }
  | { type: "ADD_SESSION"; sessionId: string; session: AgentSession }
  | { type: "REMOVE_SESSION"; sessionId: string }
  | { type: "RESET" };

export function createInitialModel(): AgentModel {
  return {
    sessions: new Map(),
    selectedSessionId: undefined,
    debugMode: false,
  };
}
