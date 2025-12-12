import { activeEditorAddHeaderTool } from "@/float/actions/activeEditorAddHeader";
import { activeEditorAddQueryParameterTool } from "@/float/actions/activeEditorAddQueryParameter";
import { activeEditorRemoveHeaderTool } from "@/float/actions/activeEditorRemoveHeader";
import { activeEditorRemoveQueryParameterTool } from "@/float/actions/activeEditorRemoveQueryParameter";
import { activeEditorReplaceBodyTool } from "@/float/actions/activeEditorReplaceBody";
import { activeEditorReplaceByStringTool } from "@/float/actions/activeEditorReplaceByString";
import { activeEditorReplaceSelectionTool } from "@/float/actions/activeEditorReplaceSelection";
import { activeEditorSetMethodTool } from "@/float/actions/activeEditorSetMethod";
import { activeEditorSetRawTool } from "@/float/actions/activeEditorSetRaw";
import { activeEditorUpdatePathTool } from "@/float/actions/activeEditorUpdatePath";
import { addFilterTool } from "@/float/actions/addFilter";
import { addLearningTool } from "@/float/actions/addLearning";
import { addMatchAndReplaceTool } from "@/float/actions/addMatchAndReplace";
import { addScopeTool } from "@/float/actions/addScope";
import { createAutomateSessionTool } from "@/float/actions/createAutomateSession";
import { createEnvironmentTool } from "@/float/actions/createEnvironment";
import { createFindingTool } from "@/float/actions/createFinding";
import { createHostedFileTool } from "@/float/actions/createHostedFile";
import { createHostedFileAdvancedTool } from "@/float/actions/createHostedFileAdvanced";
import { createReplaySessionTool } from "@/float/actions/createReplaySession";
import { deleteEnvironmentTool } from "@/float/actions/deleteEnvironment";
import { deleteEnvironmentVariableTool } from "@/float/actions/deleteEnvironmentVariable";
import { deleteFilterTool } from "@/float/actions/deleteFilter";
import { deleteScopeTool } from "@/float/actions/deleteScope";
import { filterAppendQueryTool } from "@/float/actions/filterAppendQuery";
import { httpqlSetQueryTool } from "@/float/actions/httpqlSetQuery";
import { navigateTool } from "@/float/actions/navigate";
import { removeHostedFileTool } from "@/float/actions/removeHostedFile";
import { removeLearningsTool } from "@/float/actions/removeLearnings";
import { renameReplayTabTool } from "@/float/actions/renameReplayTab";
import { replayRequestReplaceTool } from "@/float/actions/replayRequestReplace";
import { runConvertWorkflowTool } from "@/float/actions/runConvertWorkflow";
import { runWorkflowTool } from "@/float/actions/runWorkflow";
import { sendReplayTabTool } from "@/float/actions/sendReplayTab";
import { toastTool } from "@/float/actions/toast";
import { updateEnvironmentVariableTool } from "@/float/actions/updateEnvironmentVariable";
import { updateFilterTool } from "@/float/actions/updateFilter";
import { updateLearningTool } from "@/float/actions/updateLearning";
import { updateScopeTool } from "@/float/actions/updateScope";

export const floatTools = {
  httpqlSetQuery: httpqlSetQueryTool,
  toast: toastTool,
  addLearning: addLearningTool,
  updateLearning: updateLearningTool,
  removeLearnings: removeLearningsTool,
  addScope: addScopeTool,
  deleteScope: deleteScopeTool,
  updateScope: updateScopeTool,
  activeEditorReplaceSelection: activeEditorReplaceSelectionTool,
  activeEditorReplaceByString: activeEditorReplaceByStringTool,
  activeEditorReplaceBody: activeEditorReplaceBodyTool,
  activeEditorAddHeader: activeEditorAddHeaderTool,
  activeEditorAddQueryParameter: activeEditorAddQueryParameterTool,
  activeEditorRemoveQueryParameter: activeEditorRemoveQueryParameterTool,
  activeEditorUpdatePath: activeEditorUpdatePathTool,
  activeEditorRemoveHeader: activeEditorRemoveHeaderTool,
  activeEditorSetMethod: activeEditorSetMethodTool,
  activeEditorSetRaw: activeEditorSetRawTool,
  replayRequestReplace: replayRequestReplaceTool,
  navigate: navigateTool,
  renameReplayTab: renameReplayTabTool,
  sendReplayTab: sendReplayTabTool,
  addMatchAndReplace: addMatchAndReplaceTool,
  addFilter: addFilterTool,
  updateFilter: updateFilterTool,
  deleteFilter: deleteFilterTool,
  filterAppendQuery: filterAppendQueryTool,
  createHostedFile: createHostedFileTool,
  removeHostedFile: removeHostedFileTool,
  createReplaySession: createReplaySessionTool,
  createAutomateSession: createAutomateSessionTool,
  runWorkflow: runWorkflowTool,
  runConvertWorkflow: runConvertWorkflowTool,
  createFinding: createFindingTool,
  createHostedFileAdvanced: createHostedFileAdvancedTool,
  createEnvironment: createEnvironmentTool,
  deleteEnvironment: deleteEnvironmentTool,
  updateEnvironmentVariable: updateEnvironmentVariableTool,
  deleteEnvironmentVariable: deleteEnvironmentVariableTool,
};
