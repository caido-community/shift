import { type Caido } from "@caido/sdk-frontend";

import {
  type AISessionRenamingConfig,
  type CustomPrompt,
  type ModelItem,
  type ModelUserConfig,
  type Provider,
  type ReasoningConfig,
} from "@/agents/types/config";

export type FrontendSDK = Caido<Record<string, never>, Record<string, never>>;

export type PluginStorage = {
  agentsModel: string;
  floatModel: string;
  renamingModel: string;
  reasoningConfig: ReasoningConfig;
  maxIterations: number;
  customPrompts: CustomPrompt[];
  aiSessionRenaming: AISessionRenamingConfig;
  projectLearningsById?: Record<string, string[]>;
  projectMemoryById?: Record<string, string>;
  projectHistoryById: Record<string, string[]>;
  projectSpecificPromptsById: Record<string, Record<string, string>>;
  projectAutoExecuteCollectionsById: Record<string, Record<string, string>>;
  projectJitInstructionsById: Record<string, Record<string, boolean>>;
  projectShiftCollectionAutoCreateById?: Record<string, boolean>;
  customModels: ModelItem[];
  modelConfigs: Record<string, ModelUserConfig>;
  selectedProvider: Provider;
};
