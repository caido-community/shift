import { create } from "mutative";
import { createModelKey } from "shared";

import { getBuiltInModelKeys, type ModelsMessage, type ModelsModel } from "./model";

function handleAddModel(
  model: ModelsModel,
  message: Extract<ModelsMessage, { type: "ADD_MODEL" }>
): ModelsModel {
  const key = createModelKey(message.model.provider, message.model.id);
  const builtInKeys = getBuiltInModelKeys();

  if (builtInKeys.has(key)) {
    return model;
  }

  const existsInCustom = model.customModels.some((m) => createModelKey(m.provider, m.id) === key);

  if (existsInCustom) {
    return model;
  }

  return create(model, (draft) => {
    draft.customModels.push(message.model);
    draft.configOverrides[key] = {
      enabled: true,
      enabledFor: ["agent", "float"],
    };
  });
}

function handleRemoveModel(
  model: ModelsModel,
  message: Extract<ModelsMessage, { type: "REMOVE_MODEL" }>
): ModelsModel {
  const key = createModelKey(message.provider, message.id);
  const builtInKeys = getBuiltInModelKeys();

  if (builtInKeys.has(key)) {
    return model;
  }

  return create(model, (draft) => {
    draft.customModels = draft.customModels.filter((m) => createModelKey(m.provider, m.id) !== key);
    delete draft.configOverrides[key];
  });
}

function handleUpdateConfig(
  model: ModelsModel,
  message: Extract<ModelsMessage, { type: "UPDATE_CONFIG" }>
): ModelsModel {
  const builtInKeys = getBuiltInModelKeys();
  const customKeys = new Set<string>(
    model.customModels.map((m) => createModelKey(m.provider, m.id))
  );

  const isValidModel = builtInKeys.has(message.key) || customKeys.has(message.key);
  if (!isValidModel) {
    return model;
  }

  return create(model, (draft) => {
    const existing = draft.configOverrides[message.key] ?? {};
    draft.configOverrides[message.key] = { ...existing, ...message.config };
  });
}

function handleUpdateEnabledFor(
  model: ModelsModel,
  message: Extract<ModelsMessage, { type: "UPDATE_ENABLED_FOR" }>
): ModelsModel {
  const builtInKeys = getBuiltInModelKeys();
  const customKeys = new Set<string>(
    model.customModels.map((m) => createModelKey(m.provider, m.id))
  );

  const isValidModel = builtInKeys.has(message.key) || customKeys.has(message.key);
  if (!isValidModel) {
    return model;
  }

  return create(model, (draft) => {
    const existing = draft.configOverrides[message.key] ?? {};
    draft.configOverrides[message.key] = { ...existing, enabledFor: message.enabledFor };
  });
}

export function update(model: ModelsModel, message: ModelsMessage): ModelsModel {
  switch (message.type) {
    case "ADD_MODEL":
      return handleAddModel(model, message);
    case "REMOVE_MODEL":
      return handleRemoveModel(model, message);
    case "UPDATE_CONFIG":
      return handleUpdateConfig(model, message);
    case "UPDATE_ENABLED_FOR":
      return handleUpdateEnabledFor(model, message);
    default:
      return model;
  }
}
