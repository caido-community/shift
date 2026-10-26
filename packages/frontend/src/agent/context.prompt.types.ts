export type LearningPreviewSnapshot = {
  index: number;
  preview: string;
  length: number;
};

export type ConvertWorkflowSnapshot = {
  id: string;
  name: string;
  description: string;
};

export type AllowedBinarySnapshot = {
  path: string;
  instructions?: string;
};

export type EnvironmentInfoSnapshot = {
  id: string;
  name: string;
};

export type EnvironmentVariablePreviewSnapshot = {
  name: string;
  kind: "PLAIN" | "SECRET";
  preview?: string;
  valueLength: number;
};

export type ContextPromptSnapshot = {
  learnings?: LearningPreviewSnapshot[];
  httpRequest?: string;
  allowedBinaries?: AllowedBinarySnapshot[];
  entriesContext?: {
    activeEntryId: string | undefined;
    recentEntryIds: string[];
    connection?: { host: string; port: number; isTLS: boolean; SNI?: string };
  };
  environmentsContext?: {
    all: EnvironmentInfoSnapshot[];
    selectedId: string | undefined;
    selectedName?: string;
  };
  environmentVariables?: EnvironmentVariablePreviewSnapshot[];
};

export type SkillSnapshot =
  | { kind: "always-attached"; id: string; title: string; content: string }
  | { kind: "on-demand"; id: string; title: string; description?: string };

export type SkillsPromptSnapshot = {
  agentInstructions?: string;
  skills?: SkillSnapshot[];
};
