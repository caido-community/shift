import { create } from "mutative";
import type { CustomAgent, ResolvedCustomAgent } from "shared";

import type { CustomAgentsMessage, CustomAgentsModel } from "./store.model";

function handleFetchRequest(model: CustomAgentsModel): CustomAgentsModel {
  return create(model, (draft) => {
    draft.isLoading = true;
    draft.error = undefined;
  });
}

function handleFetchSuccess(
  model: CustomAgentsModel,
  definitions: CustomAgent[],
  agents: ResolvedCustomAgent[]
): CustomAgentsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.definitions = definitions;
    draft.agents = agents;
    draft.error = undefined;
  });
}

function handleFetchFailure(model: CustomAgentsModel, error: string): CustomAgentsModel {
  return create(model, (draft) => {
    draft.isLoading = false;
    draft.error = error;
  });
}

function handleRemoveSuccess(model: CustomAgentsModel, id: string): CustomAgentsModel {
  return create(model, (draft) => {
    draft.definitions = draft.definitions.filter((d) => d.id !== id);
    draft.agents = draft.agents.filter((a) => a.id !== id);
  });
}

function handleMutationFailure(model: CustomAgentsModel, error: string): CustomAgentsModel {
  return create(model, (draft) => {
    draft.error = error;
  });
}

export function update(model: CustomAgentsModel, message: CustomAgentsMessage): CustomAgentsModel {
  switch (message.type) {
    case "FETCH_REQUEST":
      return handleFetchRequest(model);

    case "FETCH_SUCCESS":
      return handleFetchSuccess(model, message.definitions, message.agents);

    case "FETCH_FAILURE":
      return handleFetchFailure(model, message.error);

    case "ADD_REQUEST":
      return model;

    case "ADD_SUCCESS":
      return model;

    case "ADD_FAILURE":
      return handleMutationFailure(model, message.error);

    case "UPDATE_REQUEST":
      return model;

    case "UPDATE_SUCCESS":
      return model;

    case "UPDATE_FAILURE":
      return handleMutationFailure(model, message.error);

    case "REMOVE_REQUEST":
      return model;

    case "REMOVE_SUCCESS":
      return handleRemoveSuccess(model, message.id);

    case "REMOVE_FAILURE":
      return handleMutationFailure(model, message.error);

    default:
      return model;
  }
}
