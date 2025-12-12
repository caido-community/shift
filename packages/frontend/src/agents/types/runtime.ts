import type { CustomPrompt } from "./config";

type AgentSelection = {
  selection: string;
  comment?: string;
};

export type AgentPromptConfig =
  | ({ id: string } & Partial<Pick<CustomPrompt, "title" | "content">>)
  | ({ id?: string } & Pick<CustomPrompt, "content" | "title">);

export type AgentRuntimeConfig = {
  model?: string;
  maxIterations?: number;
  selections: AgentSelection[];
  customPrompts: AgentPromptConfig[];
};

export type AgentRuntimeConfigInput = Partial<
  Omit<AgentRuntimeConfig, "selections" | "customPrompts">
> & {
  selections?: AgentSelection[];
  customPrompts?: AgentPromptConfig[];
};

export const createAgentRuntimeConfig = (
  options: AgentRuntimeConfigInput | undefined,
): AgentRuntimeConfig => {
  return {
    model: options?.model,
    maxIterations: options?.maxIterations,
    selections: options?.selections ? [...options.selections] : [],
    customPrompts: options?.customPrompts ? [...options.customPrompts] : [],
  };
};
