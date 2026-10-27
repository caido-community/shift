import type { ShiftMessage, StoredAgent, StoredAgentSessionState } from "shared";

import { isRecord } from "../../utils";
import { Store } from "../store";

import { type AgentsMessage, type AgentsModel, createInitialModel } from "./model";
import { update } from "./update";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

class AgentsStore extends Store<AgentsModel, AgentsMessage> {
  constructor() {
    super({ filename: "agents", perProject: true, initialModel: createInitialModel, update });
  }

  protected parse(loaded: unknown): AgentsModel | undefined {
    if (!Array.isArray(loaded) || !loaded.every(isRecord)) {
      return undefined;
    }
    return loaded as AgentsModel;
  }

  async cleanupOldAgents(): Promise<void> {
    const message = { type: "CLEANUP_OLD_AGENTS", maxAge: TWO_WEEKS_MS } as const;
    if (update(this.model, message).length !== this.model.length) {
      await this.commit(message);
    }
  }

  getAgent(chatID: string): StoredAgent | undefined {
    return this.model.find((agent) => agent.chatID === chatID);
  }

  getAgents(): StoredAgent[] {
    return this.model;
  }

  async writeAgent(
    chatID: string,
    messages: ShiftMessage[],
    sessionState: StoredAgentSessionState | undefined
  ): Promise<void> {
    await this.commit({
      type: "WRITE_AGENT",
      chatID,
      messages,
      updatedAt: Date.now(),
      sessionState,
    });
  }

  async removeAgent(chatID: string): Promise<void> {
    await this.commit({ type: "REMOVE_AGENT", chatID });
  }
}

export const agentsStore = new AgentsStore();
