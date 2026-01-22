import { create } from "mutative";

import type { SettingsMessage, SettingsModel } from "./model";

function handleUpdateSettings(
  model: SettingsModel,
  message: Extract<SettingsMessage, { type: "UPDATE_SETTINGS" }>
): SettingsModel {
  const { input } = message;

  return create(model, (draft) => {
    if (input.agentsModel !== undefined) {
      draft.agentsModel = input.agentsModel;
    }
    if (input.floatModel !== undefined) {
      draft.floatModel = input.floatModel;
    }
    if (input.renamingModel !== undefined) {
      draft.renamingModel = input.renamingModel;
    }
    if (input.maxIterations !== undefined) {
      draft.maxIterations = input.maxIterations;
    }
    if (input.renaming !== undefined) {
      draft.renaming = { ...draft.renaming, ...input.renaming };
    }
    if (input.autoCreateShiftCollection !== undefined) {
      draft.autoCreateShiftCollection = input.autoCreateShiftCollection;
    }
  });
}

function handleUpdateRenaming(
  model: SettingsModel,
  message: Extract<SettingsMessage, { type: "UPDATE_RENAMING" }>
): SettingsModel {
  return create(model, (draft) => {
    draft.renaming = { ...draft.renaming, ...message.input };
  });
}

export function update(model: SettingsModel, message: SettingsMessage): SettingsModel {
  switch (message.type) {
    case "UPDATE_SETTINGS":
      return handleUpdateSettings(model, message);
    case "UPDATE_RENAMING":
      return handleUpdateRenaming(model, message);
    default:
      return model;
  }
}
