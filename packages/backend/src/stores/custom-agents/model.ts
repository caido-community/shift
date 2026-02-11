import type { CustomAgent, UpdateCustomAgentInput } from "shared";

export type CustomAgentsModel = {
  agents: CustomAgent[];
};

export type CustomAgentsMessage =
  | { type: "ADD_AGENT"; agent: CustomAgent }
  | {
      type: "UPDATE_AGENT";
      id: string;
      updates: UpdateCustomAgentInput;
      projectId: string | undefined;
    }
  | { type: "REMOVE_AGENT"; id: string };

export function createInitialModel(): CustomAgentsModel {
  return {
    agents: [],
  };
}
