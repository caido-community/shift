import {
  type CreateDynamicSkillInput,
  type CreateStaticSkillInput,
  type ProjectSkillOverride,
  Result,
  type SetProjectOverrideInput,
  type UpdateDynamicSkillInput,
  type UpdateStaticSkillInput,
} from "shared";

import type { SkillsMessage } from "./store.model";

import type { FrontendSDK } from "@/types";

type Dispatch = (message: SkillsMessage) => void;

export async function fetchSkills(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "FETCH_REQUEST" });

  const [definitionsResult, skillsResult] = await Promise.all([
    sdk.backend.getSkillDefinitions(),
    sdk.backend.getSkills(),
  ]);

  if (definitionsResult.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: definitionsResult.error });
    return;
  }

  if (skillsResult.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: skillsResult.error });
    return;
  }

  dispatch({
    type: "FETCH_SUCCESS",
    definitions: definitionsResult.value,
    skills: skillsResult.value,
  });
}

export async function addStaticSkill(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: CreateStaticSkillInput
): Promise<Result<void>> {
  dispatch({ type: "ADD_STATIC_REQUEST", input });

  const result = await sdk.backend.addStaticSkill(input);
  if (result.kind === "Error") {
    dispatch({ type: "ADD_STATIC_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  await fetchSkills(sdk, dispatch);
  return Result.ok(undefined);
}

export async function addDynamicSkill(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: CreateDynamicSkillInput
): Promise<Result<void>> {
  dispatch({ type: "ADD_DYNAMIC_REQUEST", input });

  const result = await sdk.backend.addDynamicSkill(input);
  if (result.kind === "Error") {
    dispatch({ type: "ADD_DYNAMIC_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  await fetchSkills(sdk, dispatch);
  return Result.ok(undefined);
}

export async function updateStaticSkill(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  id: string,
  input: UpdateStaticSkillInput
): Promise<Result<void>> {
  dispatch({ type: "UPDATE_STATIC_REQUEST", id, input });

  const result = await sdk.backend.updateStaticSkill(id, input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_STATIC_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  await fetchSkills(sdk, dispatch);
  return Result.ok(undefined);
}

export async function updateDynamicSkill(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  id: string,
  input: UpdateDynamicSkillInput
): Promise<Result<void>> {
  dispatch({ type: "UPDATE_DYNAMIC_REQUEST", id, input });

  const result = await sdk.backend.updateDynamicSkill(id, input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_DYNAMIC_FAILURE", error: result.error });
    return Result.err(result.error);
  }

  await fetchSkills(sdk, dispatch);
  return Result.ok(undefined);
}

export async function removeSkill(sdk: FrontendSDK, dispatch: Dispatch, id: string) {
  dispatch({ type: "REMOVE_REQUEST", id });

  const result = await sdk.backend.removeSkill(id);
  if (result.kind === "Error") {
    dispatch({ type: "REMOVE_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "REMOVE_SUCCESS", id });
}

export async function refreshSkills(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "REFRESH_REQUEST" });

  const result = await sdk.backend.refreshSkills();
  if (result.kind === "Error") {
    dispatch({ type: "REFRESH_FAILURE", error: result.error });
    return;
  }

  const skillsResult = await sdk.backend.getSkills();
  if (skillsResult.kind === "Error") {
    dispatch({ type: "REFRESH_FAILURE", error: skillsResult.error });
    return;
  }

  dispatch({ type: "REFRESH_SUCCESS", skills: skillsResult.value });
}

export async function getProjectOverride(
  sdk: FrontendSDK,
  skillId: string
): Promise<Result<ProjectSkillOverride | undefined>> {
  const result = await sdk.backend.getProjectOverride(skillId);
  if (result.kind === "Error") {
    return Result.err(result.error);
  }
  return Result.ok(result.value);
}

export async function setProjectOverride(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: SetProjectOverrideInput
): Promise<Result<void>> {
  const result = await sdk.backend.setProjectOverride(input);
  if (result.kind === "Error") {
    return Result.err(result.error);
  }

  await fetchSkills(sdk, dispatch);
  return Result.ok(undefined);
}

export async function removeProjectOverride(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  skillId: string
): Promise<Result<void>> {
  const result = await sdk.backend.removeProjectOverride(skillId);
  if (result.kind === "Error") {
    return Result.err(result.error);
  }

  await fetchSkills(sdk, dispatch);
  return Result.ok(undefined);
}
