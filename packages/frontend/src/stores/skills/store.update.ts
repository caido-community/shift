import { create } from "mutative";
import type {
  AgentSkill,
  AgentSkillDefinition,
  UpdateDynamicSkillInput,
  UpdateStaticSkillInput,
} from "shared";

import type { SkillsMessage, SkillsModel } from "./store.model";

function handleFetchRequest(model: SkillsModel): SkillsModel {
  return create(model, (draft) => {
    draft.isLoading = true;
    draft.error = undefined;
  });
}

function handleFetchSuccess(
  model: SkillsModel,
  definitions: AgentSkillDefinition[],
  skills: AgentSkill[]
): SkillsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.definitions = definitions;
    draft.skills = skills;
    draft.error = undefined;
  });
}

function handleFetchFailure(model: SkillsModel, error: string): SkillsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.error = error;
  });
}

function handleAddStaticSuccess(
  model: SkillsModel,
  definition: AgentSkillDefinition,
  skill: AgentSkill
): SkillsModel {
  return create(model, (draft) => {
    draft.definitions.push(definition);
    draft.skills.push(skill);
  });
}

function handleAddDynamicSuccess(
  model: SkillsModel,
  definition: AgentSkillDefinition,
  skill: AgentSkill
): SkillsModel {
  return create(model, (draft) => {
    draft.definitions.push(definition);
    draft.skills.push(skill);
  });
}

function handleUpdateStaticSuccess(
  model: SkillsModel,
  id: string,
  input: UpdateStaticSkillInput
): SkillsModel {
  return create(model, (draft) => {
    const defIndex = draft.definitions.findIndex((d) => d.id === id);
    if (defIndex !== -1) {
      const def = draft.definitions[defIndex];
      if (def !== undefined && def.type === "static") {
        if (input.title !== undefined) def.title = input.title;
        if (input.content !== undefined) def.content = input.content;
      }
    }

    const skillIndex = draft.skills.findIndex((s) => s.id === id);
    if (skillIndex !== -1) {
      const skill = draft.skills[skillIndex];
      if (skill !== undefined) {
        if (input.title !== undefined) skill.title = input.title;
        if (input.content !== undefined) skill.content = input.content;
      }
    }
  });
}

function handleUpdateDynamicSuccess(
  model: SkillsModel,
  id: string,
  input: UpdateDynamicSkillInput
): SkillsModel {
  return create(model, (draft) => {
    const defIndex = draft.definitions.findIndex((d) => d.id === id);
    if (defIndex !== -1) {
      const def = draft.definitions[defIndex];
      if (def !== undefined && def.type === "dynamic") {
        if (input.title !== undefined) def.title = input.title;
        if (input.url !== undefined) def.url = input.url;
      }
    }

    const skillIndex = draft.skills.findIndex((s) => s.id === id);
    if (skillIndex !== -1) {
      const skill = draft.skills[skillIndex];
      if (skill !== undefined && input.title !== undefined) {
        skill.title = input.title;
      }
    }
  });
}

function handleRemoveSuccess(model: SkillsModel, id: string): SkillsModel {
  return create(model, (draft) => {
    draft.definitions = draft.definitions.filter((d) => d.id !== id);
    draft.skills = draft.skills.filter((s) => s.id !== id);
  });
}

function handleRefreshSuccess(model: SkillsModel, skills: AgentSkill[]): SkillsModel {
  return create(model, (draft) => {
    draft.skills = skills;
  });
}

function handleMutationFailure(model: SkillsModel, error: string): SkillsModel {
  return create(model, (draft) => {
    draft.error = error;
  });
}

export function update(model: SkillsModel, message: SkillsMessage): SkillsModel {
  switch (message.type) {
    case "FETCH_REQUEST":
      return handleFetchRequest(model);

    case "FETCH_SUCCESS":
      return handleFetchSuccess(model, message.definitions, message.skills);

    case "FETCH_FAILURE":
      return handleFetchFailure(model, message.error);

    case "ADD_STATIC_REQUEST":
      return model;

    case "ADD_STATIC_SUCCESS":
      return handleAddStaticSuccess(model, message.definition, message.skill);

    case "ADD_STATIC_FAILURE":
      return handleMutationFailure(model, message.error);

    case "ADD_DYNAMIC_REQUEST":
      return model;

    case "ADD_DYNAMIC_SUCCESS":
      return handleAddDynamicSuccess(model, message.definition, message.skill);

    case "ADD_DYNAMIC_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_STATIC_REQUEST":
      return model;

    case "UPDATE_STATIC_SUCCESS":
      return handleUpdateStaticSuccess(model, message.id, message.input);

    case "UPDATE_STATIC_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_DYNAMIC_REQUEST":
      return model;

    case "UPDATE_DYNAMIC_SUCCESS":
      return handleUpdateDynamicSuccess(model, message.id, message.input);

    case "UPDATE_DYNAMIC_FAILURE":
      return handleMutationFailure(model, message.error);

    case "REMOVE_REQUEST":
      return model;

    case "REMOVE_SUCCESS":
      return handleRemoveSuccess(model, message.id);

    case "REMOVE_FAILURE":
      return handleMutationFailure(model, message.error);

    case "REFRESH_REQUEST":
      return model;

    case "REFRESH_SUCCESS":
      return handleRefreshSuccess(model, message.skills);

    case "REFRESH_FAILURE":
      return handleMutationFailure(model, message.error);

    default:
      return model;
  }
}
