import type { ShiftMessage, StoredAgent } from "shared";

import { ProjectStore } from "../project-store";

import { type AgentsMessage, type AgentsModel, createInitialModel } from "./model";
import { update } from "./update";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

class AgentsStore extends ProjectStore<AgentsModel, AgentsMessage> {
  constructor() {
    super("agents");
  }

  protected createInitialModel(): AgentsModel {
    return createInitialModel();
  }

  protected update(model: AgentsModel, message: AgentsMessage): AgentsModel {
    return update(model, message);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    await this.cleanupOldAgents();
  }

  getAgent(chatID: string): StoredAgent | undefined {
    return this.getModel().find((agent) => agent.chatID === chatID);
  }

  getAgents(): StoredAgent[] {
    return this.getModel();
  }

  async writeAgent(chatID: string, messages: ShiftMessage[]): Promise<void> {
    this.dispatch({ type: "WRITE_AGENT", chatID, messages, updatedAt: Date.now() });
    await this.persist();
    this.notify();
  }

  async removeAgent(chatID: string): Promise<void> {
    this.dispatch({ type: "REMOVE_AGENT", chatID });
    await this.persist();
    this.notify();
  }

  private async cleanupOldAgents(): Promise<void> {
    const before = this.getModel().length;
    this.dispatch({ type: "CLEANUP_OLD_AGENTS", maxAge: TWO_WEEKS_MS });
    const after = this.getModel().length;
    if (before !== after) {
      await this.persist();
      this.notify();
    }
  }
}

let instance: AgentsStore | undefined;

export function getAgentsStore(): AgentsStore {
  if (instance === undefined) {
    instance = new AgentsStore();
  }

  return instance;
}
