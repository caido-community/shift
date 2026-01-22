import { create } from "mutative";
import type {
  AddLearningInput,
  LearningsConfig,
  RemoveLearningsInput,
  UpdateLearningInput,
} from "shared";

import type { LearningsMessage, LearningsModel } from "./store.model";

function handleFetchRequest(model: LearningsModel): LearningsModel {
  return create(model, (draft) => {
    draft.isLoading = true;
    draft.error = undefined;
  });
}

function handleFetchSuccess(model: LearningsModel, config: LearningsConfig): LearningsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.config = config;
    draft.error = undefined;
  });
}

function handleFetchFailure(model: LearningsModel, error: string): LearningsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.error = error;
  });
}

function handleAddSuccess(model: LearningsModel, input: AddLearningInput): LearningsModel {
  if (model.config === undefined) {
    return model;
  }

  const trimmed = input.content.trim();
  if (trimmed.length === 0) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.entries.push(trimmed);
  });
}

function handleUpdateSuccess(model: LearningsModel, input: UpdateLearningInput): LearningsModel {
  if (model.config === undefined) {
    return model;
  }

  const { index, content } = input;
  if (index < 0 || index >= model.config.entries.length) {
    return model;
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return create(model, (draft) => {
      if (draft.config === undefined) return;
      draft.config.entries.splice(index, 1);
    });
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.entries[index] = trimmed;
  });
}

function handleRemoveSuccess(model: LearningsModel, input: RemoveLearningsInput): LearningsModel {
  if (model.config === undefined) {
    return model;
  }

  if (input.indexes.length === 0) {
    return model;
  }

  const toRemove = new Set(input.indexes);

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.entries = draft.config.entries.filter((_, idx) => !toRemove.has(idx));
  });
}

function handleSetSuccess(model: LearningsModel, entries: string[]): LearningsModel {
  if (model.config === undefined) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.entries = entries.filter((e) => e.trim().length > 0);
  });
}

function handleClearSuccess(model: LearningsModel): LearningsModel {
  if (model.config === undefined) {
    return model;
  }

  return create(model, (draft) => {
    if (draft.config === undefined) return;
    draft.config.entries = [];
  });
}

function handleMutationFailure(model: LearningsModel, error: string): LearningsModel {
  return create(model, (draft) => {
    draft.error = error;
  });
}

export function update(model: LearningsModel, message: LearningsMessage): LearningsModel {
  switch (message.type) {
    case "FETCH_REQUEST":
      return handleFetchRequest(model);

    case "FETCH_SUCCESS":
      return handleFetchSuccess(model, message.config);

    case "FETCH_FAILURE":
      return handleFetchFailure(model, message.error);

    case "ADD_REQUEST":
      return model;

    case "ADD_SUCCESS":
      return handleAddSuccess(model, message.input);

    case "ADD_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_REQUEST":
      return model;

    case "UPDATE_SUCCESS":
      return handleUpdateSuccess(model, message.input);

    case "UPDATE_FAILURE":
      return handleMutationFailure(model, message.error);

    case "REMOVE_REQUEST":
      return model;

    case "REMOVE_SUCCESS":
      return handleRemoveSuccess(model, message.input);

    case "REMOVE_FAILURE":
      return handleMutationFailure(model, message.error);

    case "SET_REQUEST":
      return model;

    case "SET_SUCCESS":
      return handleSetSuccess(model, message.entries);

    case "SET_FAILURE":
      return handleMutationFailure(model, message.error);

    case "CLEAR_REQUEST":
      return model;

    case "CLEAR_SUCCESS":
      return handleClearSuccess(model);

    case "CLEAR_FAILURE":
      return handleMutationFailure(model, message.error);

    default:
      return model;
  }
}
