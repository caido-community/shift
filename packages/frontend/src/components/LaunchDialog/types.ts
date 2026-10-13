import type { AgentMode, Model } from "shared";

export type LaunchDialogResult = {
  customAgentId: string | undefined;
  model: Model | undefined;
  mode: AgentMode;
  selectedSkillIds: string[];
  instructions: string;
};

export type LaunchDialogProps = {
  sessionId: string;
  onConfirm: (result: LaunchDialogResult) => void;
  onCancel: () => void;
  initialSkillIds?: string[];
  initialCustomAgentId?: string;
};
