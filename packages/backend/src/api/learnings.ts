import {
  type AddLearningInput,
  AddLearningSchema,
  type LearningsConfig,
  type RemoveLearningsInput,
  RemoveLearningsSchema,
  type Result,
  type UpdateLearningInput,
  UpdateLearningSchema,
} from "shared";

import { getLearningsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getLearnings(_sdk: BackendSDK): Result<LearningsConfig> {
  try {
    const store = getLearningsStore();
    const learnings = store.getLearnings();
    return { kind: "Ok", value: learnings };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function addLearning(
  _sdk: BackendSDK,
  input: AddLearningInput
): Promise<Result<void>> {
  try {
    const parsed = AddLearningSchema.safeParse(input);
    if (parsed.success === false) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getLearningsStore();
    await store.addLearning(parsed.data.content);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function updateLearning(
  _sdk: BackendSDK,
  input: UpdateLearningInput
): Promise<Result<void>> {
  try {
    const parsed = UpdateLearningSchema.safeParse(input);
    if (parsed.success === false) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getLearningsStore();
    await store.updateLearning(parsed.data.index, parsed.data.content);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function removeLearnings(
  _sdk: BackendSDK,
  input: RemoveLearningsInput
): Promise<Result<void>> {
  try {
    const parsed = RemoveLearningsSchema.safeParse(input);
    if (parsed.success === false) {
      return { kind: "Error", error: parsed.error.message };
    }

    const store = getLearningsStore();
    await store.removeLearnings(parsed.data.indexes);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function setLearnings(_sdk: BackendSDK, entries: string[]): Promise<Result<void>> {
  try {
    const store = getLearningsStore();
    await store.setLearnings(entries);
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}

export async function clearLearnings(_sdk: BackendSDK): Promise<Result<void>> {
  try {
    const store = getLearningsStore();
    await store.clearLearnings();
    return { kind: "Ok", value: undefined };
  } catch (error) {
    return { kind: "Error", error: (error as Error).message };
  }
}
