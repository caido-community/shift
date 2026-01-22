import { automateSessionCreateTool } from "@/float/actions/automate/AutomateSessionCreate";
import { editorBodyReplaceTool } from "@/float/actions/editor/EditorBodyReplace";
import { editorHeaderAddTool } from "@/float/actions/editor/EditorHeaderAdd";
import { editorHeaderRemoveTool } from "@/float/actions/editor/EditorHeaderRemove";
import { editorHeaderSetTool } from "@/float/actions/editor/EditorHeaderSet";
import { editorMethodSetTool } from "@/float/actions/editor/EditorMethodSet";
import { editorPathSetTool } from "@/float/actions/editor/EditorPathSet";
import { editorQueryAddTool } from "@/float/actions/editor/EditorQueryAdd";
import { editorQueryRemoveTool } from "@/float/actions/editor/EditorQueryRemove";
import { editorQuerySetTool } from "@/float/actions/editor/EditorQuerySet";
import { editorRawSetTool } from "@/float/actions/editor/EditorRawSet";
import { editorSelectionReplaceTool } from "@/float/actions/editor/EditorSelectionReplace";
import { editorStringReplaceTool } from "@/float/actions/editor/EditorStringReplace";
import { environmentCreateTool } from "@/float/actions/environments/EnvironmentCreate";
import { environmentDeleteTool } from "@/float/actions/environments/EnvironmentDelete";
import { environmentVariableDeleteTool } from "@/float/actions/environments/EnvironmentVariableDelete";
import { environmentVariableUpdateTool } from "@/float/actions/environments/EnvironmentVariableUpdate";
import { filterAddTool } from "@/float/actions/filters/FilterAdd";
import { filterDeleteTool } from "@/float/actions/filters/FilterDelete";
import { filterQueryAppendTool } from "@/float/actions/filters/FilterQueryAppend";
import { filterUpdateTool } from "@/float/actions/filters/FilterUpdate";
import { findingCreateTool } from "@/float/actions/findings/FindingCreate";
import { hostedFileCreateTool } from "@/float/actions/hostedFiles/HostedFileCreate";
import { hostedFileCreateAdvancedTool } from "@/float/actions/hostedFiles/HostedFileCreateAdvanced";
import { hostedFileRemoveTool } from "@/float/actions/hostedFiles/HostedFileRemove";
import { httpqlQuerySetTool } from "@/float/actions/httpql/HttpqlQuerySet";
import { learningAddTool } from "@/float/actions/learnings/LearningAdd";
import { learningsRemoveTool } from "@/float/actions/learnings/LearningsRemove";
import { learningUpdateTool } from "@/float/actions/learnings/LearningUpdate";
import { matchReplaceAddTool } from "@/float/actions/matchReplace/MatchReplaceAdd";
import { navigateTool } from "@/float/actions/navigation/Navigate";
import { replayRequestReplaceTool } from "@/float/actions/replay/ReplayRequestReplace";
import { replaySessionCreateTool } from "@/float/actions/replay/ReplaySessionCreate";
import { replayTabRenameTool } from "@/float/actions/replay/ReplayTabRename";
import { replayTabSendTool } from "@/float/actions/replay/ReplayTabSend";
import { scopeAddTool } from "@/float/actions/scopes/ScopeAdd";
import { scopeDeleteTool } from "@/float/actions/scopes/ScopeDelete";
import { scopeUpdateTool } from "@/float/actions/scopes/ScopeUpdate";
import { toastTool } from "@/float/actions/ui/Toast";
import { workflowConvertRunTool } from "@/float/actions/workflows/WorkflowConvertRun";
import { workflowRunTool } from "@/float/actions/workflows/WorkflowRun";

export const floatTools = {
  httpqlQuerySet: httpqlQuerySetTool,
  uiToast: toastTool,
  learningAdd: learningAddTool,
  learningUpdate: learningUpdateTool,
  learningsRemove: learningsRemoveTool,
  scopeAdd: scopeAddTool,
  scopeDelete: scopeDeleteTool,
  scopeUpdate: scopeUpdateTool,
  editorSelectionReplace: editorSelectionReplaceTool,
  editorStringReplace: editorStringReplaceTool,
  editorBodyReplace: editorBodyReplaceTool,
  editorHeaderAdd: editorHeaderAddTool,
  editorQueryAdd: editorQueryAddTool,
  editorQueryRemove: editorQueryRemoveTool,
  editorQuerySet: editorQuerySetTool,
  editorPathSet: editorPathSetTool,
  editorHeaderSet: editorHeaderSetTool,
  editorHeaderRemove: editorHeaderRemoveTool,
  editorMethodSet: editorMethodSetTool,
  editorRawSet: editorRawSetTool,
  replayRequestReplace: replayRequestReplaceTool,
  navigate: navigateTool,
  replayTabRename: replayTabRenameTool,
  replayTabSend: replayTabSendTool,
  matchReplaceAdd: matchReplaceAddTool,
  filterAdd: filterAddTool,
  filterUpdate: filterUpdateTool,
  filterDelete: filterDeleteTool,
  filterQueryAppend: filterQueryAppendTool,
  hostedFileCreate: hostedFileCreateTool,
  hostedFileRemove: hostedFileRemoveTool,
  replaySessionCreate: replaySessionCreateTool,
  automateSessionCreate: automateSessionCreateTool,
  workflowRun: workflowRunTool,
  workflowConvertRun: workflowConvertRunTool,
  findingCreate: findingCreateTool,
  hostedFileCreateAdvanced: hostedFileCreateAdvancedTool,
  environmentCreate: environmentCreateTool,
  environmentDelete: environmentDeleteTool,
  environmentVariableUpdate: environmentVariableUpdateTool,
  environmentVariableDelete: environmentVariableDeleteTool,
};
