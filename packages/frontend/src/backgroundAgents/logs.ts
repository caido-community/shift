export type BackgroundAgentLogPart = {
  text: string;
  muted: boolean;
};

const TOOL_COMPLETED_DISPLAY_NAMES: Record<string, string> = {
  httpqlQuerySet: "Set HTTPQL query",
  uiToast: "Showed toast",
  learningAdd: "Added learning",
  learningUpdate: "Updated learning",
  learningsRemove: "Removed learning",
  scopeAdd: "Added scope",
  scopeDelete: "Deleted scope",
  scopeUpdate: "Updated scope",
  editorSelectionReplace: "Replaced selection",
  editorStringReplace: "Replaced string",
  editorBodyReplace: "Replaced body",
  editorHeaderAdd: "Added header",
  editorQueryAdd: "Added query param",
  editorQueryRemove: "Removed query param",
  editorQuerySet: "Set query param",
  editorPathSet: "Set path",
  editorHeaderSet: "Set header",
  editorHeaderRemove: "Removed header",
  editorMethodSet: "Set method",
  editorRawSet: "Set raw request",
  replayRequestReplace: "Replaced replay request",
  navigate: "Navigated",
  replayTabRename: "Renamed replay tab",
  replayTabSend: "Sent request",
  matchReplaceAdd: "Added match & replace",
  filterAdd: "Added filter",
  filterUpdate: "Updated filter",
  filterDelete: "Deleted filter",
  filterQueryAppend: "Appended filter query",
  hostedFileCreate: "Created hosted file",
  hostedFileCreateAdvanced: "Created hosted file",
  hostedFileRemove: "Removed hosted file",
  replaySessionCreate: "Created replay session",
  automateSessionCreate: "Created automate session",
  workflowRun: "Ran workflow",
  workflowConvertRun: "Ran convert workflow",
  findingCreate: "Created finding",
  environmentCreate: "Created environment",
  environmentDelete: "Deleted environment",
  environmentVariableUpdate: "Updated variable",
  environmentVariableDelete: "Deleted variable",
  historyRead: "Read history",
  historyRequestResponseRead: "Read request/response",
  HistoryRowHighlight: "Highlighted history row",
  backgroundAgentSpawn: "Spawned agent",
};

export const getCompletedToolDisplayName = (toolName: string): string =>
  TOOL_COMPLETED_DISPLAY_NAMES[toolName] ?? toolName;

export const plainParts = (text: string): BackgroundAgentLogPart[] => [{ text, muted: false }];
