import type { LearningsConfig } from "shared";

import { ProjectStore } from "../project-store";

import { createInitialModel, type LearningsMessage, type LearningsModel } from "./model";
import { update } from "./update";

class LearningsStore extends ProjectStore<LearningsModel, LearningsMessage> {
  constructor() {
    super("learnings");
  }

  protected createInitialModel(): LearningsModel {
    return createInitialModel();
  }

  protected update(model: LearningsModel, message: LearningsMessage): LearningsModel {
    return update(model, message);
  }

  getLearnings(): LearningsConfig {
    return this.getModel();
  }

  getEntries(): string[] {
    return this.getModel().entries;
  }

  async addLearning(content: string): Promise<void> {
    this.dispatch({ type: "ADD_LEARNING", content });
    await this.persist();
    this.notify();
  }

  async updateLearning(index: number, content: string): Promise<void> {
    this.dispatch({ type: "UPDATE_LEARNING", index, content });
    await this.persist();
    this.notify();
  }

  async removeLearnings(indexes: number[]): Promise<void> {
    this.dispatch({ type: "REMOVE_LEARNINGS", indexes });
    await this.persist();
    this.notify();
  }

  async setLearnings(entries: string[]): Promise<void> {
    this.dispatch({ type: "SET_LEARNINGS", entries });
    await this.persist();
    this.notify();
  }

  async clearLearnings(): Promise<void> {
    this.dispatch({ type: "CLEAR_LEARNINGS" });
    await this.persist();
    this.notify();
  }
}

let instance: LearningsStore | undefined;

export function getLearningsStore(): LearningsStore {
  if (instance === undefined) {
    instance = new LearningsStore();
  }
  return instance;
}
