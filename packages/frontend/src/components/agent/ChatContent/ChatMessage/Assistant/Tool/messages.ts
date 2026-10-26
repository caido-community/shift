import { display as binaryExecRunDisplay } from "@/agent/tools/binaries/BinaryExecRun";
import { display as contextReadDisplay } from "@/agent/tools/context/ContextRead";
import { display as environmentCreateDisplay } from "@/agent/tools/environment/EnvironmentCreate";
import { display as environmentReadDisplay } from "@/agent/tools/environment/EnvironmentRead";
import { display as environmentRemoveDisplay } from "@/agent/tools/environment/EnvironmentRemove";
import { display as environmentUpdateDisplay } from "@/agent/tools/environment/EnvironmentUpdate";
import { display as FindingsCreateDisplay } from "@/agent/tools/findings/FindingsCreate";
import { display as historySearchDisplay } from "@/agent/tools/history/HistorySearch";
import { display as learningAddDisplay } from "@/agent/tools/learnings/LearningAdd";
import { display as learningReadDisplay } from "@/agent/tools/learnings/LearningRead";
import { display as learningRemoveDisplay } from "@/agent/tools/learnings/LearningRemove";
import { display as learningUpdateDisplay } from "@/agent/tools/learnings/LearningUpdate";
import { display as payloadBlobCreateDisplay } from "@/agent/tools/payload/PayloadBlobCreate";
import { display as payloadBlobRangeReadDisplay } from "@/agent/tools/payload/PayloadBlobRangeRead";
import { display as replayConnectionSetDisplay } from "@/agent/tools/replay/ReplayConnectionSet";
import { display as replayEntryNavigateDisplay } from "@/agent/tools/replay/ReplayEntryNavigate";
import { display as requestBodySetDisplay } from "@/agent/tools/request/RequestBodySet";
import { display as requestRangeReadDisplay } from "@/agent/tools/request/RequestRangeRead";
import { display as requestRawEditDisplay } from "@/agent/tools/request/RequestRawEdit";
import { display as requestRawSetDisplay } from "@/agent/tools/request/RequestRawSet";
import { display as requestSendDisplay } from "@/agent/tools/request/RequestSend";
import { display as responseRangeReadDisplay } from "@/agent/tools/response/ResponseRangeRead";
import { display as responseSearchDisplay } from "@/agent/tools/response/ResponseSearch";
import { display as readSkillDisplay } from "@/agent/tools/skills/ReadSkill";
import { display as workflowConvertListDisplay } from "@/agent/tools/workflows/WorkflowConvertList";
import { display as workflowConvertRunDisplay } from "@/agent/tools/workflows/WorkflowConvertRun";
import { type ToolDisplay } from "@/agent/types";

const configs = {
  BinaryExecRun: binaryExecRunDisplay,
  ContextRead: contextReadDisplay,
  LearningAdd: learningAddDisplay,
  LearningRead: learningReadDisplay,
  LearningUpdate: learningUpdateDisplay,
  LearningRemove: learningRemoveDisplay,
  PayloadBlobCreate: payloadBlobCreateDisplay,
  PayloadBlobRangeRead: payloadBlobRangeReadDisplay,
  RequestBodySet: requestBodySetDisplay,
  RequestRangeRead: requestRangeReadDisplay,
  RequestRawEdit: requestRawEditDisplay,
  RequestRawSet: requestRawSetDisplay,
  RequestSend: requestSendDisplay,
  ResponseRangeRead: responseRangeReadDisplay,
  ResponseSearch: responseSearchDisplay,
  ReadSkill: readSkillDisplay,
  EnvironmentCreate: environmentCreateDisplay,
  EnvironmentRead: environmentReadDisplay,
  EnvironmentUpdate: environmentUpdateDisplay,
  EnvironmentRemove: environmentRemoveDisplay,
  HistorySearch: historySearchDisplay,
  FindingsCreate: FindingsCreateDisplay,
  ReplayEntryNavigate: replayEntryNavigateDisplay,
  ReplayConnectionSet: replayConnectionSetDisplay,
  WorkflowConvertList: workflowConvertListDisplay,
  WorkflowConvertRun: workflowConvertRunDisplay,
} as const;

type ToolName = keyof typeof configs;

export function getToolMessages(name: string): ToolDisplay<unknown, unknown> | undefined {
  if (name in configs) {
    return configs[name as ToolName] as ToolDisplay<unknown, unknown>;
  }
  return undefined;
}
