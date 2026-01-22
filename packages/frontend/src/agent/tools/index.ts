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
  RequestQueryRemove,
  RequestQuerySet,
  RequestRawEdit,
  RequestRawSet,
  RequestSend,
} from "./request";
import { ResponseRead } from "./response";
import { TodoAdd, TodoComplete, TodoRemove } from "./todo";

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
  RequestQueryRemove,
  RequestQuerySet,
  RequestRawEdit,
  RequestRawSet,
  RequestSend,
  ResponseRead,
  EnvironmentCreate,
  EnvironmentUpdate,
  EnvironmentRemove,
  HistorySearch,
  FindingsCreate,
  ReplayEntryNavigate,
};
