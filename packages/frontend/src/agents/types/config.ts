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

export enum Provider {
  OpenRouter = "OpenRouter",
  OpenAI = "OpenAI",
  Anthropic = "Anthropic",
  Google = "Google",
}

export type ModelItem = {
  name: string;
  id: string;
  provider: Provider;
  isReasoningModel?: boolean;
  enabled?: boolean;
};

export type ModelUserConfig = {
  id: string;
  enabled: boolean;
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
  gistUrl?: string;
  projectSpecificPrompt?: string;
};

export type AISessionRenamingConfig = {
  enabled: boolean;
  renameAfterSend: boolean;
  instructions: string;
};
