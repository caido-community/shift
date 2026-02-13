import { type CreateCustomAgentInput, Result, type UpdateCustomAgentInput } from "shared";

import type { CustomAgentsMessage } from "./store.model";

import type { FrontendSDK } from "@/types";

type Dispatch = (message: CustomAgentsMessage) => void;

export async function fetchCustomAgents(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "FETCH_REQUEST" });

  const [definitionsResult, agentsResult] = await Promise.all([
    sdk.backend.getCustomAgentDefinitions(),
    sdk.backend.getResolvedCustomAgents(),
  ]);

  if (definitionsResult.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: definitionsResult.error });
    return;
  }

  if (agentsResult.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: agentsResult.error });
    return;
  }

  dispatch({
    type: "FETCH_SUCCESS",
    definitions: definitionsResult.value,
    agents: agentsResult.value,
  });
}

export async function addCustomAgent(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: CreateCustomAgentInput
): Promise<Result<void>> {
  dispatch({ type: "ADD_REQUEST", input });

  const result = await sdk.backend.addCustomAgent(input);
  if (result.kind === "Error") {
    dispatch({ type: "ADD_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  dispatch({ type: "ADD_SUCCESS" });
  await fetchCustomAgents(sdk, dispatch);
  return Result.ok(undefined);
}

export async function updateCustomAgent(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  id: string,
  input: UpdateCustomAgentInput
): Promise<Result<void>> {
  dispatch({ type: "UPDATE_REQUEST", id, input });

  const result = await sdk.backend.updateCustomAgent(id, input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  dispatch({ type: "UPDATE_SUCCESS" });
  await fetchCustomAgents(sdk, dispatch);
  return Result.ok(undefined);
}

export async function removeCustomAgent(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  id: string
): Promise<Result<void>> {
  dispatch({ type: "REMOVE_REQUEST", id });

  const result = await sdk.backend.removeCustomAgent(id);
  if (result.kind === "Error") {
    dispatch({ type: "REMOVE_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  dispatch({ type: "REMOVE_SUCCESS", id });
  return Result.ok(undefined);
}
