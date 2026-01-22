import { create } from "mutative";

import type { SkillsMessage, SkillsModel } from "./model";

function handleAddStaticSkill(
  model: SkillsModel,
  message: Extract<SkillsMessage, { type: "ADD_STATIC_SKILL" }>
): SkillsModel {
  return create(model, (draft) => {
    draft.skills.push(message.definition);
  });
}

function handleAddDynamicSkill(
  model: SkillsModel,
  message: Extract<SkillsMessage, { type: "ADD_DYNAMIC_SKILL" }>
): SkillsModel {
  return create(model, (draft) => {
    draft.skills.push(message.definition);
  });
}

function handleUpdateStaticSkill(
  model: SkillsModel,
  message: Extract<SkillsMessage, { type: "UPDATE_STATIC_SKILL" }>
): SkillsModel {
  const index = model.skills.findIndex((s) => s.id === message.id && s.type === "static");
  if (index === -1) {
    return model;
  }

  return create(model, (draft) => {
    const skill = draft.skills[index];
    if (skill !== undefined && skill.type === "static") {
      if (message.updates.title !== undefined) {
        skill.title = message.updates.title;
      }
      if (message.updates.content !== undefined) {
        skill.content = message.updates.content;
      }
      if (message.updates.scope !== undefined) {
        skill.scope = message.updates.scope;
        skill.projectId = message.updates.scope === "project" ? message.projectId : undefined;
      }
    }
  });
}

function handleUpdateDynamicSkill(
  model: SkillsModel,
  message: Extract<SkillsMessage, { type: "UPDATE_DYNAMIC_SKILL" }>
): SkillsModel {
  const index = model.skills.findIndex((s) => s.id === message.id && s.type === "dynamic");
  if (index === -1) {
    return model;
  }

  return create(model, (draft) => {
    const skill = draft.skills[index];
    if (skill !== undefined && skill.type === "dynamic") {
      if (message.updates.title !== undefined) {
        skill.title = message.updates.title;
      }
      if (message.updates.url !== undefined) {
        skill.url = message.updates.url;
      }
      if (message.updates.scope !== undefined) {
        skill.scope = message.updates.scope;
        skill.projectId = message.updates.scope === "project" ? message.projectId : undefined;
      }
    }
  });
}

function handleRemoveSkill(
  model: SkillsModel,
  message: Extract<SkillsMessage, { type: "REMOVE_SKILL" }>
): SkillsModel {
  return create(model, (draft) => {
    draft.skills = draft.skills.filter((s) => s.id !== message.id);
  });
}

export function update(model: SkillsModel, message: SkillsMessage): SkillsModel {
  switch (message.type) {
    case "ADD_STATIC_SKILL":
      return handleAddStaticSkill(model, message);
    case "ADD_DYNAMIC_SKILL":
      return handleAddDynamicSkill(model, message);
    case "UPDATE_STATIC_SKILL":
      return handleUpdateStaticSkill(model, message);
    case "UPDATE_DYNAMIC_SKILL":
      return handleUpdateDynamicSkill(model, message);
    case "REMOVE_SKILL":
      return handleRemoveSkill(model, message);
    default:
      return model;
  }
}
