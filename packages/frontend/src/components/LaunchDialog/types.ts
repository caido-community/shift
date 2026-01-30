import type { Model } from "shared";

export type SelectionEntry = {
  id: number;
  selection: string;
  comment: string;
};

export type LaunchDialogResult = {
  model: Model | undefined;
  selectedSkillIds: string[];
  maxIterations: number;
  instructions: string;
  selections: Array<{
    selection: string;
    comment: string;
  }>;
};

export type LaunchDialogProps = {
  onConfirm: (result: LaunchDialogResult) => void;
  onCancel: () => void;
  initialSkillIds?: string[];
};
