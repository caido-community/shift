import type { ShiftMessage, StoredAgent, StoredAgentSessionState } from "shared";

export type AgentsModel = StoredAgent[];

export type AgentsMessage =
  | {
      type: "WRITE_AGENT";
      chatID: string;
      messages: ShiftMessage[];
      updatedAt: number;
      sessionState: StoredAgentSessionState | undefined;
    }
  | { type: "REMOVE_AGENT"; chatID: string }
  | { type: "CLEANUP_OLD_AGENTS"; maxAge: number };

export function createInitialModel(): AgentsModel {
  return [];
}
