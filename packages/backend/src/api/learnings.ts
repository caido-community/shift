import {
  type AddLearningInput,
  AddLearningSchema,
  type LearningsConfig,
  type RemoveLearningsInput,
  RemoveLearningsSchema,
  Result,
  type UpdateLearningInput,
  UpdateLearningSchema,
} from "shared";

import { learningsStore } from "../stores";
import type { BackendSDK } from "../types";

export function getLearnings(_sdk: BackendSDK): Result<LearningsConfig> {
  try {
    return Result.ok(learningsStore.getLearnings());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function addLearning(
  _sdk: BackendSDK,
  input: AddLearningInput
): Promise<Result<LearningsConfig>> {
  try {
    const parsed = AddLearningSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return Result.ok(await learningsStore.addLearning(parsed.data.content));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function updateLearning(
  _sdk: BackendSDK,
  input: UpdateLearningInput
): Promise<Result<LearningsConfig>> {
  try {
    const parsed = UpdateLearningSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return Result.ok(await learningsStore.updateLearning(parsed.data.index, parsed.data.content));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function removeLearnings(
  _sdk: BackendSDK,
  input: RemoveLearningsInput
): Promise<Result<LearningsConfig>> {
  try {
    const parsed = RemoveLearningsSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    return Result.ok(await learningsStore.removeLearnings(parsed.data.indexes));
  } catch (error) {
    return Result.err((error as Error).message);
  }
}

export async function clearLearnings(_sdk: BackendSDK): Promise<Result<LearningsConfig>> {
  try {
    return Result.ok(await learningsStore.clearLearnings());
  } catch (error) {
    return Result.err((error as Error).message);
  }
}
