import type { AgentsMessage, AgentsModel } from "./model";

function handleWriteAgent(
  model: AgentsModel,
  message: Extract<AgentsMessage, { type: "WRITE_AGENT" }>
): AgentsModel {
  const { chatID, messages, updatedAt, sessionState } = message;
  const agent = { chatID, messages, updatedAt, sessionState };
  const existingIndex = model.findIndex((existing) => existing.chatID === chatID);

  if (existingIndex === -1) {
    return [...model, agent];
  }
  return model.map((existing, index) => (index === existingIndex ? agent : existing));
}

function handleRemoveAgent(
  model: AgentsModel,
  message: Extract<AgentsMessage, { type: "REMOVE_AGENT" }>
): AgentsModel {
  return model.filter((agent) => agent.chatID !== message.chatID);
}

function handleCleanupOldAgents(
  model: AgentsModel,
  message: Extract<AgentsMessage, { type: "CLEANUP_OLD_AGENTS" }>
): AgentsModel {
  const now = Date.now();
  return model.filter((agent) => now - agent.updatedAt < message.maxAge);
}

export function update(model: AgentsModel, message: AgentsMessage): AgentsModel {
  switch (message.type) {
    case "WRITE_AGENT":
      return handleWriteAgent(model, message);
    case "REMOVE_AGENT":
      return handleRemoveAgent(model, message);
    case "CLEANUP_OLD_AGENTS":
      return handleCleanupOldAgents(model, message);
    default:
      return model;
  }
}
