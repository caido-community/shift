import { create } from "mutative";
import {
  type AddModelInput,
  createModelKey,
  type ModelsConfig,
  type ModelUsageType,
  type RemoveModelInput,
  type UpdateModelConfigInput,
} from "shared";

import type { ModelsMessage, ModelsModel } from "./store.model";

function handleFetchRequest(model: ModelsModel): ModelsModel {
  return create(model, (draft) => {
    draft.isLoading = true;
    draft.error = undefined;
  });
}

function handleFetchSuccess(model: ModelsModel, config: ModelsConfig): ModelsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.config = config;
    draft.error = undefined;
  });
}

function handleFetchFailure(model: ModelsModel, error: string): ModelsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.error = error;
  });
}

function handleAddModelSuccess(model: ModelsModel, input: AddModelInput): ModelsModel {
  if (model.config === undefined) {
    return model;
  }

  const key = createModelKey(input.provider, input.id);
  const exists = model.config.models.some((m) => createModelKey(m.provider, m.id) === key);

  if (exists) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.models.push(input);
    draft.config.config[key] = {
      modelKey: key,
      enabled: true,
      enabledFor: ["agent", "float"],
    };
    draft.config.customModelKeys.push(key);
  });
}

function handleRemoveModelSuccess(model: ModelsModel, input: RemoveModelInput): ModelsModel {
  if (model.config === undefined) {
    return model;
  }

  const key = createModelKey(input.provider, input.id);

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.models = draft.config.models.filter(
      (m) => createModelKey(m.provider, m.id) !== key
    );
    delete draft.config.config[key];
    draft.config.customModelKeys = draft.config.customModelKeys.filter((k) => k !== key);
  });
}

function handleUpdateConfigSuccess(
  model: ModelsModel,
  key: string,
  input: UpdateModelConfigInput
): ModelsModel {
  if (model.config === undefined) {
    return model;
  }

  const existing = model.config.config[key];
  if (existing === undefined) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.config[key] = { ...existing, ...input };
  });
}

function handleUpdateEnabledForSuccess(
  model: ModelsModel,
  key: string,
  enabledFor: ModelUsageType[]
): ModelsModel {
  if (model.config === undefined) {
    return model;
  }

  const existing = model.config.config[key];
  if (existing === undefined) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.config[key] = { ...existing, enabledFor };
  });
}

function handleMutationFailure(model: ModelsModel, error: string): ModelsModel {
  return create(model, (draft) => {
    draft.error = error;
  });
}

export function update(model: ModelsModel, message: ModelsMessage): ModelsModel {
  switch (message.type) {
    case "FETCH_REQUEST":
      return handleFetchRequest(model);

    case "FETCH_SUCCESS":
      return handleFetchSuccess(model, message.config);

    case "FETCH_FAILURE":
      return handleFetchFailure(model, message.error);

    case "ADD_MODEL_REQUEST":
      return model;

    case "ADD_MODEL_SUCCESS":
      return handleAddModelSuccess(model, message.input);

    case "ADD_MODEL_FAILURE":
      return handleMutationFailure(model, message.error);

    case "REMOVE_MODEL_REQUEST":
      return model;

    case "REMOVE_MODEL_SUCCESS":
      return handleRemoveModelSuccess(model, message.input);

    case "REMOVE_MODEL_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_CONFIG_REQUEST":
      return model;

    case "UPDATE_CONFIG_SUCCESS":
      return handleUpdateConfigSuccess(model, message.key, message.input);

    case "UPDATE_CONFIG_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_ENABLED_FOR_REQUEST":
      return model;

    case "UPDATE_ENABLED_FOR_SUCCESS":
      return handleUpdateEnabledForSuccess(model, message.key, message.enabledFor);

    case "UPDATE_ENABLED_FOR_FAILURE":
      return handleMutationFailure(model, message.error);

    default:
      return model;
  }
}
