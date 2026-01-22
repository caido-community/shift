import type {
  AddModelInput,
  RemoveModelInput,
  UpdateModelConfigInput,
  UpdateModelEnabledForInput,
} from "shared";

import type { ModelsMessage } from "./store.model";

import type { FrontendSDK } from "@/types";

type Dispatch = (message: ModelsMessage) => void;

export async function fetchModelsConfig(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "FETCH_REQUEST" });

  const result = await sdk.backend.getModelsConfig();
  if (result.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "FETCH_SUCCESS", config: result.value });
}

export async function addModel(sdk: FrontendSDK, dispatch: Dispatch, input: AddModelInput) {
  dispatch({ type: "ADD_MODEL_REQUEST", input });

  const result = await sdk.backend.addModel(input);
  if (result.kind === "Error") {
    dispatch({ type: "ADD_MODEL_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "ADD_MODEL_SUCCESS", input });
}

export async function removeModel(sdk: FrontendSDK, dispatch: Dispatch, input: RemoveModelInput) {
  dispatch({ type: "REMOVE_MODEL_REQUEST", input });

  const result = await sdk.backend.removeModel(input);
  if (result.kind === "Error") {
    dispatch({ type: "REMOVE_MODEL_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "REMOVE_MODEL_SUCCESS", input });
}

export async function updateModelConfig(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  key: string,
  input: UpdateModelConfigInput
) {
  dispatch({ type: "UPDATE_CONFIG_REQUEST", key, input });

  const result = await sdk.backend.updateModelConfig(key, input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_CONFIG_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "UPDATE_CONFIG_SUCCESS", key, input });
}

export async function updateModelEnabledFor(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  key: string,
  input: UpdateModelEnabledForInput
) {
  dispatch({ type: "UPDATE_ENABLED_FOR_REQUEST", key, input });

  const result = await sdk.backend.updateModelEnabledFor(key, input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_ENABLED_FOR_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "UPDATE_ENABLED_FOR_SUCCESS", key, enabledFor: input.enabledFor });
}
