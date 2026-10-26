import { Result, type ShiftMessage, type StoredAgent, type StoredAgentSessionState } from "shared";

import { agentsStore } from "../stores";
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
    return Result.ok(agentsStore.getAgent(chatID));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export function getAgents(_sdk: BackendSDK): Result<StoredAgent[]> {
  try {
    return Result.ok(agentsStore.getAgents());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function writeAgent(
  _sdk: BackendSDK,
  chatID: string,
  messages: ShiftMessage[],
  sessionState: StoredAgentSessionState | undefined
): Promise<Result<void>> {
  try {
    await agentsStore.writeAgent(chatID, normalizeMessages(messages), sessionState);
    return Result.ok(undefined);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function removeAgent(_sdk: BackendSDK, chatID: string): Promise<Result<void>> {
  try {
    await agentsStore.removeAgent(chatID);
    return Result.ok(undefined);
  } catch (error) {
    return Result.err((error as Error).message);
  }
}
