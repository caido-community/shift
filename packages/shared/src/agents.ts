import { type UIMessage, type UITool, type UIToolInvocation } from "ai";

import type { AgentMode } from "./custom-agents";

export type ReasoningTime = {
  start: number;
  end?: number;
};

export type MessageState = "streaming" | "done" | "aborted" | "error";
export type MessageMetadata = {
  state?: MessageState;
  reasoning_times?: {
    start: number;
    end?: number;
  }[];
  usage?: {
    inputTokens?: number;
    cacheReadTokens?: number;
  };
  /** `provider/id` of the model that produced the message. */
  model?: string;
};
export type PartState = UIToolInvocation<UITool>["state"];

export type ShiftDataTypes = {
  /** Marks a context compaction: everything before it reaches the model only as this summary. */
  compaction: { summary: string };
};

export type ShiftMessage = UIMessage<MessageMetadata, ShiftDataTypes>;

export type StoredAgentSessionState = {
  selectedCustomAgentId?: string;
  mode?: AgentMode;
};

export type StoredAgent = {
  chatID: string;
  messages: ShiftMessage[];
  updatedAt: number;
  sessionState?: StoredAgentSessionState;
};
