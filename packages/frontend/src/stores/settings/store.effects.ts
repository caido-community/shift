import type { RenamingConfig, UpdateSettingsInput } from "shared";

import type { SettingsMessage } from "./store.model";

import type { FrontendSDK } from "@/types";

type Dispatch = (message: SettingsMessage) => void;

export async function fetchSettings(sdk: FrontendSDK, dispatch: Dispatch) {
  dispatch({ type: "FETCH_REQUEST" });

  const result = await sdk.backend.getSettings();
  if (result.kind === "Error") {
    dispatch({ type: "FETCH_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "FETCH_SUCCESS", config: result.value });
}

export async function updateSettings(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: UpdateSettingsInput
) {
  dispatch({ type: "UPDATE_REQUEST", input });

  const result = await sdk.backend.updateSettings(input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "UPDATE_SUCCESS", input });
}

export async function updateRenaming(
  sdk: FrontendSDK,
  dispatch: Dispatch,
  input: Partial<RenamingConfig>
) {
  dispatch({ type: "UPDATE_RENAMING_REQUEST", input });

  const result = await sdk.backend.updateRenaming(input);
  if (result.kind === "Error") {
    dispatch({ type: "UPDATE_RENAMING_FAILURE", error: result.error });
    return;
  }

  dispatch({ type: "UPDATE_RENAMING_SUCCESS", input });
}
