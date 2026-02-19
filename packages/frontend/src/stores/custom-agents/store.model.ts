import type {
  CreateCustomAgentInput,
  CustomAgent,
  ResolvedCustomAgent,
  UpdateCustomAgentInput,
} from "shared";

export type CustomAgentsModel = {
  definitions: CustomAgent[];
  agents: ResolvedCustomAgent[];
  isLoading: boolean;
  error: string | undefined;
};

export const initialModel: CustomAgentsModel = {
  definitions: [],
  agents: [],
  isLoading: false,
  error: undefined,
};

export type CustomAgentsMessage =
  | { type: "FETCH_REQUEST" }
  | { type: "FETCH_SUCCESS"; definitions: CustomAgent[]; agents: ResolvedCustomAgent[] }
  | { type: "FETCH_FAILURE"; error: string }
  | { type: "ADD_REQUEST"; input: CreateCustomAgentInput }
  | { type: "ADD_SUCCESS" }
  | { type: "ADD_FAILURE"; error: string }
  | { type: "UPDATE_REQUEST"; id: string; input: UpdateCustomAgentInput }
  | { type: "UPDATE_SUCCESS" }
  | { type: "UPDATE_FAILURE"; error: string }
  | { type: "REMOVE_REQUEST"; id: string }
  | { type: "REMOVE_SUCCESS"; id: string }
  | { type: "REMOVE_FAILURE"; error: string };
