import { BinaryExecRun } from "./binaries";
import {
  EnvironmentCreate,
  EnvironmentRead,
  EnvironmentRemove,
  EnvironmentUpdate,
} from "./environment";
import { FindingsCreate } from "./findings";
import { HistorySearch } from "./history";
import { LearningAdd, LearningRead, LearningRemove, LearningUpdate } from "./learnings";
import { PayloadBlobCreate, PayloadBlobRangeRead } from "./payload";
import { ReplayEntryNavigate } from "./replay";
import {
  RequestBodySet,
  RequestCookieAdd,
  RequestCookieRemove,
  RequestCookieSet,
  RequestHeaderAdd,
  RequestHeaderRemove,
  RequestHeaderSet,
  RequestMethodSet,
  RequestPathSet,
  RequestQueryAdd,
  RequestQueryRemove,
  RequestQuerySet,
  RequestRangeRead,
  RequestRawEdit,
  RequestRawSet,
  RequestSend,
} from "./request";
import { ResponseRangeRead, ResponseSearch } from "./response";
import { ReadSkill } from "./skills";
import { TodoAdd, TodoComplete, TodoRemove, TodoStart } from "./todo";
import { WorkflowConvertList, WorkflowConvertRun } from "./workflows";

export const shiftAgentTools = {
  BinaryExecRun,
  PayloadBlobCreate,
  PayloadBlobRangeRead,
  TodoAdd,
  TodoStart,
  TodoComplete,
  TodoRemove,
  LearningAdd,
  LearningRead,
  LearningUpdate,
  LearningRemove,
  RequestBodySet,
  RequestCookieAdd,
  RequestCookieRemove,
  RequestCookieSet,
  RequestHeaderAdd,
  RequestHeaderRemove,
  RequestHeaderSet,
  RequestMethodSet,
  RequestPathSet,
  RequestQueryAdd,
  RequestQueryRemove,
  RequestQuerySet,
  RequestRangeRead,
  RequestRawEdit,
  RequestRawSet,
  RequestSend,
  ResponseRangeRead,
  ResponseSearch,
  ReadSkill,
  EnvironmentCreate,
  EnvironmentRead,
  EnvironmentUpdate,
  EnvironmentRemove,
  HistorySearch,
  FindingsCreate,
  ReplayEntryNavigate,
  WorkflowConvertList,
  WorkflowConvertRun,
};
