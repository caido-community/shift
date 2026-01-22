import { type Result, type ShiftMessage, type StoredAgent } from "shared";

import { getAgentsStore } from "../stores";
import { type BackendSDK } from "../types";

function normalizeMessages(messages: ShiftMessage[]): ShiftMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") return message;
    if (!message.metadata || message.metadata.state !== "streaming") {
      return message;
    }
    return {
      ...message,
      metadata: {
        ...message.metadata,
        state: "aborted" as const,
      },
    };
  });
}

export function getAgent(_sdk: BackendSDK, chatID: string): Result<StoredAgent | undefined> {
  try {
    const store = getAgentsStore();
    const agent = store.getAgent(chatID);
    return { kind: "Ok", value: agent };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export function getAgents(_sdk: BackendSDK): Result<StoredAgent[]> {
  try {
    const store = getAgentsStore();
    const agents = store.getAgents();
    return { kind: "Ok", value: agents };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export function writeAgent(
  _sdk: BackendSDK,
  chatID: string,
  messages: ShiftMessage[]
): Result<void> {
  try {
    const store = getAgentsStore();
    const normalizedMessages = normalizeMessages(messages);
    store.writeAgent(chatID, normalizedMessages);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export function removeAgent(_sdk: BackendSDK, chatID: string): Result<void> {
  try {
    const store = getAgentsStore();
    store.removeAgent(chatID);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}
