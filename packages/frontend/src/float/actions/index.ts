import { activeEditorAddHeader } from "@/float/actions/activeEditorAddHeader";
import { activeEditorAddQueryParameter } from "@/float/actions/activeEditorAddQueryParameter";
import { activeEditorRemoveHeader } from "@/float/actions/activeEditorRemoveHeader";
import { activeEditorRemoveQueryParameter } from "@/float/actions/activeEditorRemoveQueryParameter";
import { activeEditorReplaceBody } from "@/float/actions/activeEditorReplaceBody";
import { activeEditorReplaceByString } from "@/float/actions/activeEditorReplaceByString";
import { activeEditorReplaceSelection } from "@/float/actions/activeEditorReplaceSelection";
import { activeEditorSetMethod } from "@/float/actions/activeEditorSetMethod";
import { activeEditorUpdatePath } from "@/float/actions/activeEditorUpdatePath";
import { addFilter } from "@/float/actions/addFilter";
import { addLearning } from "@/float/actions/addLearning";
import { addMatchAndReplace } from "@/float/actions/addMatchAndReplace";
import { addScope } from "@/float/actions/addScope";
import { createAutomateSession } from "@/float/actions/createAutomateSession";
import { createEnvironment } from "@/float/actions/createEnvironment";
import { createFinding } from "@/float/actions/createFinding";
import { createHostedFile } from "@/float/actions/createHostedFile";
import { createHostedFileAdvanced } from "@/float/actions/createHostedFileAdvanced";
import { createReplaySession } from "@/float/actions/createReplaySession";
import { deleteEnvironment } from "@/float/actions/deleteEnvironment";
import { deleteEnvironmentVariable } from "@/float/actions/deleteEnvironmentVariable";
import { deleteFilter } from "@/float/actions/deleteFilter";
import { deleteScope } from "@/float/actions/deleteScope";
import { filterAppendQuery } from "@/float/actions/filterAppendQuery";
import { httpqlSetQuery } from "@/float/actions/httpqlSetQuery";
import { navigate } from "@/float/actions/navigate";
import { removeHostedFile } from "@/float/actions/removeHostedFile";
import { removeLearnings } from "@/float/actions/removeLearnings";
import { renameReplayTab } from "@/float/actions/renameReplayTab";
import { replayRequestReplace } from "@/float/actions/replayRequestReplace";
import { runConvertWorkflow } from "@/float/actions/runConvertWorkflow";
import { sendReplayTab } from "@/float/actions/sendReplayTab";
import { toast } from "@/float/actions/toast";
import { updateEnvironmentVariable } from "@/float/actions/updateEnvironmentVariable";
import { updateFilter } from "@/float/actions/updateFilter";
import { updateLearning } from "@/float/actions/updateLearning";
import { updateScope } from "@/float/actions/updateScope";
import { type ActionDefinition } from "@/float/types";

export const registeredActions = [
  httpqlSetQuery,
  toast,
  addLearning,
  updateLearning,
  removeLearnings,
  addScope,
  deleteScope,
  updateScope,
  activeEditorReplaceSelection,
  activeEditorReplaceByString,
  activeEditorReplaceBody,
  activeEditorAddHeader,
  activeEditorAddQueryParameter,
  activeEditorRemoveQueryParameter,
  activeEditorUpdatePath,
  activeEditorRemoveHeader,
  activeEditorSetMethod,
  replayRequestReplace,
  navigate,
  renameReplayTab,
  sendReplayTab,
  addMatchAndReplace,
  addFilter,
  updateFilter,
  deleteFilter,
  filterAppendQuery,
  createHostedFile,
  removeHostedFile,
  createReplaySession,
  createAutomateSession,
  runConvertWorkflow,
  createFinding,
  createHostedFileAdvanced,
  createEnvironment,
  deleteEnvironment,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
] as ActionDefinition[];
