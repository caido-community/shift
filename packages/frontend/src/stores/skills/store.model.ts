import type {
  AgentSkill,
  AgentSkillDefinition,
  CreateDynamicSkillInput,
  CreateStaticSkillInput,
  UpdateDynamicSkillInput,
  UpdateStaticSkillInput,
} from "shared";

export type SkillsModel = {
  definitions: AgentSkillDefinition[];
  skills: AgentSkill[];
  isLoading: boolean;
  error: string | undefined;
};

export const initialModel: SkillsModel = {
  definitions: [],
  skills: [],
  isLoading: false,
  error: undefined,
};

export type SkillsMessage =
  | { type: "FETCH_REQUEST" }
  | { type: "FETCH_SUCCESS"; definitions: AgentSkillDefinition[]; skills: AgentSkill[] }
  | { type: "FETCH_FAILURE"; error: string }
  | { type: "ADD_STATIC_REQUEST"; input: CreateStaticSkillInput }
  | { type: "ADD_STATIC_SUCCESS"; definition: AgentSkillDefinition; skill: AgentSkill }
  | { type: "ADD_STATIC_FAILURE"; error: string }
  | { type: "ADD_DYNAMIC_REQUEST"; input: CreateDynamicSkillInput }
  | { type: "ADD_DYNAMIC_SUCCESS"; definition: AgentSkillDefinition; skill: AgentSkill }
  | { type: "ADD_DYNAMIC_FAILURE"; error: string }
  | { type: "UPDATE_STATIC_REQUEST"; id: string; input: UpdateStaticSkillInput }
  | { type: "UPDATE_STATIC_SUCCESS"; id: string; input: UpdateStaticSkillInput }
  | { type: "UPDATE_STATIC_FAILURE"; error: string }
  | { type: "UPDATE_DYNAMIC_REQUEST"; id: string; input: UpdateDynamicSkillInput }
  | { type: "UPDATE_DYNAMIC_SUCCESS"; id: string; input: UpdateDynamicSkillInput }
  | { type: "UPDATE_DYNAMIC_FAILURE"; error: string }
  | { type: "REMOVE_REQUEST"; id: string }
  | { type: "REMOVE_SUCCESS"; id: string }
  | { type: "REMOVE_FAILURE"; error: string }
  | { type: "REFRESH_REQUEST" }
  | { type: "REFRESH_SUCCESS"; skills: AgentSkill[] }
  | { type: "REFRESH_FAILURE"; error: string };
