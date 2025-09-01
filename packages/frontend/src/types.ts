import { type Caido } from "@caido/sdk-frontend";

import {
  type AISessionRenamingConfig,
  type CustomPrompt,
  type ReasoningConfig,
} from "@/agents/types/config";

export type FrontendSDK = Caido<Record<string, never>, Record<string, never>>;

export type PluginStorage = {
  openRouterApiKey: string;
  agentsModel: string;
  floatModel: string;
  renamingModel: string;
  reasoningConfig: ReasoningConfig;
  maxIterations: number;
  customPrompts: CustomPrompt[];
  aiSessionRenaming: AISessionRenamingConfig;
  projectMemoryById: Record<string, string>;
  projectHistoryById: Record<string, string[]>;
};
