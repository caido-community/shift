import { type Component } from "vue";

export type AgentConfig = {
  id: string;
  maxIterations: number;
  openRouterConfig: OpenRouterConfig;
  prompts: CustomPrompt[];
};

export type ReasoningConfig = {
  enabled: boolean;
  max_tokens?: number;
};

export type OpenRouterConfig = {
  apiKey: string;
  model: string;
  reasoning?: ReasoningConfig;
};

export type ModelItem = {
  name: string;
  id: string;
  isRecommended?: boolean;
  isReasoningModel?: boolean;
  onlyFor?: "float" | "chat" | "renaming";
};

export type ModelGroup = {
  label: string;
  icon: Component;
  items: ModelItem[];
};

export type CustomPrompt = {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
};

export type AISessionRenamingConfig = {
  enabled: boolean;
  renameAfterSend: boolean;
  instructions: string;
};
