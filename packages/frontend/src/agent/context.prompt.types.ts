export type ContextTodoSnapshot = {
  id: string;
  content: string;
  completed: boolean;
};

export type PayloadBlobSummarySnapshot = {
  blobId: string;
  reason: string;
  length: number;
  preview: string;
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

export type ContextPromptSnapshot = {
  todos?: ContextTodoSnapshot[];
  payloadBlobs?: PayloadBlobSummarySnapshot[];
  learnings?: string[];
  httpRequest?: string;
  allowedConvertWorkflows?: ConvertWorkflowSnapshot[];
  allowedBinaries?: AllowedBinarySnapshot[];
  entriesContext?: {
    activeEntryId: string | undefined;
    recentEntryIds: string[];
  };
  environmentsContext?: {
    all: EnvironmentInfoSnapshot[];
    selectedId: string | undefined;
    selectedName?: string;
  };
  environmentVariablesJson?: string;
};

export type SkillSnapshot = {
  title: string;
  content: string;
};

export type SkillsPromptSnapshot = {
  agentInstructions?: string;
  skills?: SkillSnapshot[];
};
