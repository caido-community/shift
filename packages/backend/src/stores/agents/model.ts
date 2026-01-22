import type { ShiftMessage, StoredAgent } from "shared";

export type AgentsModel = StoredAgent[];

export type AgentsMessage =
  | { type: "WRITE_AGENT"; chatID: string; messages: ShiftMessage[]; updatedAt: number }
  | { type: "REMOVE_AGENT"; chatID: string }
  | { type: "CLEANUP_OLD_AGENTS"; maxAge: number };

export function createInitialModel(): AgentsModel {
  return [];
}
