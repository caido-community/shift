import { display as binaryExecRunDisplay } from "@/agent/tools/binaries/BinaryExecRun";
import { display as environmentCreateDisplay } from "@/agent/tools/environment/EnvironmentCreate";
import { display as environmentRemoveDisplay } from "@/agent/tools/environment/EnvironmentRemove";
import { display as environmentUpdateDisplay } from "@/agent/tools/environment/EnvironmentUpdate";
import { display as FindingsCreateDisplay } from "@/agent/tools/findings/FindingsCreate";
import { display as historySearchDisplay } from "@/agent/tools/history/HistorySearch";
import { display as learningAddDisplay } from "@/agent/tools/learnings/LearningAdd";
import { display as learningRemoveDisplay } from "@/agent/tools/learnings/LearningRemove";
import { display as learningUpdateDisplay } from "@/agent/tools/learnings/LearningUpdate";
import { display as replayEntryNavigateDisplay } from "@/agent/tools/replay/ReplayEntryNavigate";
import { display as requestBodySetDisplay } from "@/agent/tools/request/RequestBodySet";
import { display as requestCookieAddDisplay } from "@/agent/tools/request/RequestCookieAdd";
import { display as requestCookieRemoveDisplay } from "@/agent/tools/request/RequestCookieRemove";
import { display as requestCookieSetDisplay } from "@/agent/tools/request/RequestCookieSet";
import { display as requestHeaderAddDisplay } from "@/agent/tools/request/RequestHeaderAdd";
import { display as requestHeaderRemoveDisplay } from "@/agent/tools/request/RequestHeaderRemove";
import { display as requestHeaderSetDisplay } from "@/agent/tools/request/RequestHeaderSet";
import { display as requestMethodSetDisplay } from "@/agent/tools/request/RequestMethodSet";
import { display as requestPathSetDisplay } from "@/agent/tools/request/RequestPathSet";
import { display as requestQueryAddDisplay } from "@/agent/tools/request/RequestQueryAdd";
import { display as requestQueryRemoveDisplay } from "@/agent/tools/request/RequestQueryRemove";
import { display as requestQuerySetDisplay } from "@/agent/tools/request/RequestQuerySet";
import { display as requestRangeReadDisplay } from "@/agent/tools/request/RequestRangeRead";
import { display as requestRawEditDisplay } from "@/agent/tools/request/RequestRawEdit";
import { display as requestRawSetDisplay } from "@/agent/tools/request/RequestRawSet";
import { display as requestSendDisplay } from "@/agent/tools/request/RequestSend";
import { display as responseRangeReadDisplay } from "@/agent/tools/response/ResponseRangeRead";
import { display as responseSearchDisplay } from "@/agent/tools/response/ResponseSearch";
import { display as todoAddDisplay } from "@/agent/tools/todo/TodoAdd";
import { display as todoCompleteDisplay } from "@/agent/tools/todo/TodoComplete";
import { display as todoRemoveDisplay } from "@/agent/tools/todo/TodoRemove";
import { display as workflowConvertListDisplay } from "@/agent/tools/workflows/WorkflowConvertList";
import { display as workflowConvertRunDisplay } from "@/agent/tools/workflows/WorkflowConvertRun";
import { type ToolDisplay } from "@/agent/types";

const configs = {
  BinaryExecRun: binaryExecRunDisplay,
  TodoAdd: todoAddDisplay,
  TodoComplete: todoCompleteDisplay,
  TodoRemove: todoRemoveDisplay,
  LearningAdd: learningAddDisplay,
  LearningUpdate: learningUpdateDisplay,
  LearningRemove: learningRemoveDisplay,
  RequestBodySet: requestBodySetDisplay,
  RequestCookieAdd: requestCookieAddDisplay,
  RequestCookieRemove: requestCookieRemoveDisplay,
  RequestCookieSet: requestCookieSetDisplay,
  RequestHeaderAdd: requestHeaderAddDisplay,
  RequestHeaderRemove: requestHeaderRemoveDisplay,
  RequestHeaderSet: requestHeaderSetDisplay,
  RequestMethodSet: requestMethodSetDisplay,
  RequestPathSet: requestPathSetDisplay,
  RequestQueryAdd: requestQueryAddDisplay,
  RequestQueryRemove: requestQueryRemoveDisplay,
  RequestQuerySet: requestQuerySetDisplay,
  RequestRangeRead: requestRangeReadDisplay,
  RequestRawEdit: requestRawEditDisplay,
  RequestRawSet: requestRawSetDisplay,
  RequestSend: requestSendDisplay,
  ResponseRangeRead: responseRangeReadDisplay,
  ResponseSearch: responseSearchDisplay,
  EnvironmentCreate: environmentCreateDisplay,
  EnvironmentUpdate: environmentUpdateDisplay,
  EnvironmentRemove: environmentRemoveDisplay,
  HistorySearch: historySearchDisplay,
  FindingsCreate: FindingsCreateDisplay,
  ReplayEntryNavigate: replayEntryNavigateDisplay,
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
