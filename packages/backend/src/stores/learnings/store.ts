import type { LearningsConfig } from "shared";

import { isRecord } from "../../utils";
import { Store } from "../store";

import { createInitialModel, type LearningsMessage, type LearningsModel } from "./model";
import { update } from "./update";

class LearningsStore extends Store<LearningsModel, LearningsMessage> {
  constructor() {
    super({ filename: "learnings", perProject: true, initialModel: createInitialModel, update });
  }

  protected parse(loaded: unknown): LearningsModel | undefined {
    if (!isRecord(loaded)) {
      return undefined;
    }
    const model = { ...createInitialModel(), ...loaded };
    const valid =
      Array.isArray(model.entries) && model.entries.every((entry) => typeof entry === "string");
    return valid ? model : undefined;
  }

  getLearnings(): LearningsConfig {
    return this.model;
  }

  addLearning(content: string): Promise<LearningsConfig> {
    return this.commit({ type: "ADD_LEARNING", content });
  }

  updateLearning(index: number, content: string): Promise<LearningsConfig> {
    return this.commit({ type: "UPDATE_LEARNING", index, content });
  }

  removeLearnings(indexes: number[]): Promise<LearningsConfig> {
    return this.commit({ type: "REMOVE_LEARNINGS", indexes });
  }

  clearLearnings(): Promise<LearningsConfig> {
    return this.commit({ type: "CLEAR_LEARNINGS" });
  }
}

export const learningsStore = new LearningsStore();
