import { create } from "mutative";

import type { CustomAgentsMessage, CustomAgentsModel } from "./model";

function handleAddAgent(
  model: CustomAgentsModel,
  message: Extract<CustomAgentsMessage, { type: "ADD_AGENT" }>
): CustomAgentsModel {
  return create(model, (draft) => {
    draft.agents.push(message.agent);
  });
}

function handleUpdateAgent(
  model: CustomAgentsModel,
  message: Extract<CustomAgentsMessage, { type: "UPDATE_AGENT" }>
): CustomAgentsModel {
  const index = model.agents.findIndex((a) => a.id === message.id);
  if (index === -1) {
    return model;
  }

  return create(model, (draft) => {
    const agent = draft.agents[index];
    if (agent === undefined) return;

    if (message.updates.name !== undefined) {
      agent.name = message.updates.name;
    }
    if (message.updates.description !== undefined) {
      agent.description = message.updates.description;
    }
    if (message.updates.skillIds !== undefined) {
      agent.skillIds = message.updates.skillIds;
    }
    if (message.updates.allowedWorkflowIds !== undefined) {
      agent.allowedWorkflowIds =
        message.updates.allowedWorkflowIds === null
          ? undefined
          : message.updates.allowedWorkflowIds;
    }
    if (message.updates.allowedBinaries !== undefined) {
      agent.allowedBinaries =
        message.updates.allowedBinaries === null ? undefined : message.updates.allowedBinaries;
    }
    if (message.updates.instructions !== undefined) {
      agent.instructions = message.updates.instructions;
    }
    if (message.updates.scope !== undefined) {
      agent.scope = message.updates.scope;
      agent.projectId = message.updates.scope === "project" ? message.projectId : undefined;
    }
    if (message.updates.boundCollections !== undefined) {
      agent.boundCollections = message.updates.boundCollections;
    }
  });
}

function handleRemoveAgent(
  model: CustomAgentsModel,
  message: Extract<CustomAgentsMessage, { type: "REMOVE_AGENT" }>
): CustomAgentsModel {
  return create(model, (draft) => {
    draft.agents = draft.agents.filter((a) => a.id !== message.id);
  });
}

export function update(model: CustomAgentsModel, message: CustomAgentsMessage): CustomAgentsModel {
  switch (message.type) {
    case "ADD_AGENT":
      return handleAddAgent(model, message);
    case "UPDATE_AGENT":
      return handleUpdateAgent(model, message);
    case "REMOVE_AGENT":
      return handleRemoveAgent(model, message);
    default:
      return model;
  }
}
