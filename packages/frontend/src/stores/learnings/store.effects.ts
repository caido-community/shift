import type { AddLearningInput, RemoveLearningsInput, UpdateLearningInput } from "shared";

import type { LearningsMessage } from "./store.model";

import type { FrontendSDK } from "@/types";

type Dispatch = (message: LearningsMessage) => void;

export async function fetchLearnings(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "FETCH_REQUEST" });

  const result = await sdk.backend.getLearnings();
  if (result.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "FETCH_SUCCESS", config: result.value });
}

export async function addLearning(sdk: FrontendSDK, dispatch: Dispatch, input: AddLearningInput) {
  dispatch({ type: "ADD_REQUEST", input });

  const result = await sdk.backend.addLearning(input);
  if (result.kind === "Error") {
    dispatch({ type: "ADD_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "ADD_SUCCESS", input });
}

export async function updateLearning(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: UpdateLearningInput
) {
  dispatch({ type: "UPDATE_REQUEST", input });

  const result = await sdk.backend.updateLearning(input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "UPDATE_SUCCESS", input });
}

export async function removeLearnings(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: RemoveLearningsInput
) {
  dispatch({ type: "REMOVE_REQUEST", input });

  const result = await sdk.backend.removeLearnings(input);
  if (result.kind === "Error") {
    dispatch({ type: "REMOVE_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "REMOVE_SUCCESS", input });
}

export async function clearLearnings(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "CLEAR_REQUEST" });

  const result = await sdk.backend.clearLearnings();
  if (result.kind === "Error") {
    dispatch({ type: "CLEAR_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "CLEAR_SUCCESS" });
}
