export type ReasoningConfig = {
  enabled: boolean;
  max_tokens?: number;
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
