import { create } from "mutative";

import type { LearningsMessage, LearningsModel } from "./model";

function handleAddLearning(
  model: LearningsModel,
  message: Extract<LearningsMessage, { type: "ADD_LEARNING" }>
): LearningsModel {
  const trimmed = message.content.trim();
  if (trimmed.length === 0) {
    return model;
  }

  return create(model, (draft) => {
    draft.entries.push(trimmed);
  });
}

function handleUpdateLearning(
  model: LearningsModel,
  message: Extract<LearningsMessage, { type: "UPDATE_LEARNING" }>
): LearningsModel {
  const { index, content } = message;

  if (index < 0 || index >= model.entries.length) {
    return model;
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return create(model, (draft) => {
      draft.entries.splice(index, 1);
    });
  }

  return create(model, (draft) => {
    draft.entries[index] = trimmed;
  });
}

function handleRemoveLearnings(
  model: LearningsModel,
  message: Extract<LearningsMessage, { type: "REMOVE_LEARNINGS" }>
): LearningsModel {
  const { indexes } = message;

  if (indexes.length === 0) {
    return model;
  }

  const toRemove = new Set(indexes);

  return create(model, (draft) => {
    draft.entries = draft.entries.filter((_: string, idx: number) => !toRemove.has(idx));
  });
}

function handleSetLearnings(
  model: LearningsModel,
  message: Extract<LearningsMessage, { type: "SET_LEARNINGS" }>
): LearningsModel {
  return create(model, (draft) => {
    draft.entries = message.entries.filter((e) => e.trim().length > 0);
  });
}

function handleClearLearnings(model: LearningsModel): LearningsModel {
  if (model.entries.length === 0) {
    return model;
  }

  return create(model, (draft) => {
    draft.entries = [];
  });
}

export function update(model: LearningsModel, message: LearningsMessage): LearningsModel {
  switch (message.type) {
    case "ADD_LEARNING":
      return handleAddLearning(model, message);
    case "UPDATE_LEARNING":
      return handleUpdateLearning(model, message);
    case "REMOVE_LEARNINGS":
      return handleRemoveLearnings(model, message);
    case "SET_LEARNINGS":
      return handleSetLearnings(model, message);
    case "CLEAR_LEARNINGS":
      return handleClearLearnings(model);
    default:
      return model;
  }
}
