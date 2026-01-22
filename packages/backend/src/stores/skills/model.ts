import type {
  AgentSkillDefinition,
  DynamicSkillDefinition,
  StaticSkillDefinition,
  UpdateDynamicSkillInput,
  UpdateStaticSkillInput,
} from "shared";

import { DEFAULT_SKILLS } from "../../skills/defaults";

export type SkillsModel = {
  skills: AgentSkillDefinition[];
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
  | { type: "REMOVE_SKILL"; id: string };

export function createInitialModel(): SkillsModel {
  return {
    skills: [...DEFAULT_SKILLS],
  };
}
