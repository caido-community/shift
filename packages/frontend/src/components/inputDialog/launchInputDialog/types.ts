export type LaunchInputDialogResult = {
  selections: Array<{
    selection: string;
    comment: string;
  }>;
  instructions: string;
  maxInteractions: number;
  model?: string;
  selectedPromptIds?: string[];
};
