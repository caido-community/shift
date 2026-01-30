import type {
  AgentSkillDefinition,
  DynamicSkillDefinition,
  ProjectSkillOverride,
  StaticSkillDefinition,
  UpdateDynamicSkillInput,
  UpdateStaticSkillInput,
} from "shared";

import { DEFAULT_SKILLS } from "../../skills/defaults";

export type SkillsModel = {
  skills: AgentSkillDefinition[];
  projectOverrides: ProjectSkillOverride[];
};

export type SkillsMessage =
  | { type: "ADD_STATIC_SKILL"; definition: StaticSkillDefinition }
  | { type: "ADD_DYNAMIC_SKILL"; definition: DynamicSkillDefinition }
  | {
      type: "UPDATE_STATIC_SKILL";
      id: string;
      updates: UpdateStaticSkillInput;
      projectId: string | undefined;
    }
  | {
      type: "UPDATE_DYNAMIC_SKILL";
      id: string;
      updates: UpdateDynamicSkillInput;
      projectId: string | undefined;
    }
  | { type: "REMOVE_SKILL"; id: string }
  | { type: "SET_PROJECT_OVERRIDE"; override: ProjectSkillOverride }
  | { type: "REMOVE_PROJECT_OVERRIDE"; skillId: string; projectId: string };

export function createInitialModel(): SkillsModel {
  return {
    skills: [...DEFAULT_SKILLS],
    projectOverrides: [],
  };
}
