import { EnvironmentCreate, EnvironmentRemove, EnvironmentUpdate } from "./environment";
import { FindingsCreate } from "./findings";
import { HistorySearch } from "./history";
import { LearningAdd, LearningRemove, LearningUpdate } from "./learnings";
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
import { TodoAdd, TodoComplete, TodoRemove } from "./todo";
import { WorkflowConvertList, WorkflowConvertRun } from "./workflows";

export const shiftAgentTools = {
  TodoAdd,
  TodoComplete,
  TodoRemove,
  LearningAdd,
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
  EnvironmentCreate,
  EnvironmentUpdate,
  EnvironmentRemove,
  HistorySearch,
  FindingsCreate,
  ReplayEntryNavigate,
  WorkflowConvertList,
  WorkflowConvertRun,
};
