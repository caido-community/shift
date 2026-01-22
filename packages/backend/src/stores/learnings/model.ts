import { defaultLearningsConfig, type LearningsConfig } from "shared";

export type LearningsModel = LearningsConfig;

export type LearningsMessage =
  | { type: "ADD_LEARNING"; content: string }
  | { type: "UPDATE_LEARNING"; index: number; content: string }
  | { type: "REMOVE_LEARNINGS"; indexes: number[] }
  | { type: "SET_LEARNINGS"; entries: string[] }
  | { type: "CLEAR_LEARNINGS" };

export function createInitialModel(): LearningsModel {
  return { ...defaultLearningsConfig };
}
