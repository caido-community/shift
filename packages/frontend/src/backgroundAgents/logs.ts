export type BackgroundAgentLogPart = {
  text: string;
  muted: boolean;
};

export const plainParts = (text: string): BackgroundAgentLogPart[] => [{ text, muted: false }];
