import { create } from "mutative";
import type { RenamingConfig, SettingsConfig, UpdateSettingsInput } from "shared";

import type { SettingsMessage, SettingsModel } from "./store.model";

function handleFetchRequest(model: SettingsModel): SettingsModel {
  return create(model, (draft) => {
    draft.isLoading = true;
    draft.error = undefined;
  });
}

function handleFetchSuccess(model: SettingsModel, config: SettingsConfig): SettingsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.config = config;
    draft.error = undefined;
  });
}

function handleFetchFailure(model: SettingsModel, error: string): SettingsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.error = error;
  });
}

function handleUpdateSuccess(model: SettingsModel, input: UpdateSettingsInput): SettingsModel {
  if (model.config === undefined) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;

    if (input.agentsModel !== undefined) {
      draft.config.agentsModel = input.agentsModel;
    }
    if (input.floatModel !== undefined) {
      draft.config.floatModel = input.floatModel;
    }
    if (input.renamingModel !== undefined) {
      draft.config.renamingModel = input.renamingModel;
    }
    if (input.maxIterations !== undefined) {
      draft.config.maxIterations = input.maxIterations;
    }
    if (input.debugToolsEnabled !== undefined) {
      draft.config.debugToolsEnabled = input.debugToolsEnabled;
    }
    if (input.renaming !== undefined) {
      draft.config.renaming = { ...draft.config.renaming, ...input.renaming };
    }
    if (input.autoCreateShiftCollection !== undefined) {
      draft.config.autoCreateShiftCollection = input.autoCreateShiftCollection;
    }
    if (input.openRouterPrioritizeFastProviders !== undefined) {
      draft.config.openRouterPrioritizeFastProviders = input.openRouterPrioritizeFastProviders;
    }
  });
}

function handleUpdateRenamingSuccess(
  model: SettingsModel,
  input: Partial<RenamingConfig>
): SettingsModel {
  if (model.config === undefined) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.renaming = { ...draft.config.renaming, ...input };
  });
}

function handleMutationFailure(model: SettingsModel, error: string): SettingsModel {
  return create(model, (draft) => {
    draft.error = error;
  });
}

export function update(model: SettingsModel, message: SettingsMessage): SettingsModel {
  switch (message.type) {
    case "FETCH_REQUEST":
      return handleFetchRequest(model);

    case "FETCH_SUCCESS":
      return handleFetchSuccess(model, message.config);

    case "FETCH_FAILURE":
      return handleFetchFailure(model, message.error);

    case "UPDATE_REQUEST":
      return model;

    case "UPDATE_SUCCESS":
      return handleUpdateSuccess(model, message.input);

    case "UPDATE_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_RENAMING_REQUEST":
      return model;

    case "UPDATE_RENAMING_SUCCESS":
      return handleUpdateRenamingSuccess(model, message.input);

    case "UPDATE_RENAMING_FAILURE":
      return handleMutationFailure(model, message.error);

    default:
      return model;
  }
}
