import { type EditorView } from "@codemirror/view";
import { Result } from "shared";

import { isPresent } from "./optional";

import { type FrontendSDK } from "@/types";

export async function safeGraphQL<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<Result<T>> {
  let result: T;
  try {
    result = await fn();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error occurred";
    return Result.err(`${errorMessage}: ${detail}`);
  }

  if (!isPresent(result)) {
    return Result.err(`${errorMessage}: Query returned no data`);
  }

  return Result.ok(result);
}

type ReplaySession = {
  id: string;
  activeEntryId: string;
  request: {
    raw: string;
    host: string;
    port: number;
    isTLS: boolean;
    SNI: string;
  };
};

export type ReplayEntryRequest = {
  entry: ReplayHttpEntry;
  request: ReplayHttpEntry["request"];
};

type ConnectionInfo = {
  host: string;
  port: number;
  isTLS: boolean;
  SNI?: string | null;
};

type ReplayHttpRequest = {
  id: string;
  raw?: string;
  host?: string;
  port?: number;
  isTls?: boolean;
  sni?: string | null;
};

type RawReplayHttpEntry = {
  __typename?: "ReplayEntry" | "ReplayEntryHttp";
  id: string;
  raw?: string;
  connection: ConnectionInfo;
  request?: ReplayHttpRequest | null;
  session: {
    id: string;
  };
};

type ReplayHttpEntry = RawReplayHttpEntry & {
  raw: string;
};

type ReplayWsEntry = {
  __typename?: "ReplayEntryWs";
  id: string;
  http: RawReplayHttpEntry;
};

type ReplayEntry = RawReplayHttpEntry | ReplayWsEntry;

type ReplaySessionEntriesQuery = {
  replaySession?: {
    activeEntry?: ReplayEntry | null;
    entries: {
      edges: Array<{
        node: ReplayEntry;
      }>;
    };
  } | null;
};

const toReplayHttpEntry = (
  entry: ReplayEntry | null | undefined
): RawReplayHttpEntry | undefined => {
  if (!isPresent(entry)) {
    return undefined;
  }

  if ("http" in entry) {
    return entry.http;
  }

  return entry;
};

const matchesReplayEntryId = (entry: ReplayEntry, entryId: string): boolean => {
  if (entry.id === entryId) {
    return true;
  }

  return "http" in entry && entry.http.id === entryId;
};

const hydrateReplayHttpEntry = async (
  sdk: FrontendSDK,
  entry: RawReplayHttpEntry
): Promise<Result<ReplayEntryRequest>> => {
  if (entry.raw !== undefined) {
    return Result.ok({ entry: { ...entry, raw: entry.raw }, request: entry.request });
  }

  if (!isPresent(entry.request?.id)) {
    return Result.err("Replay entry has no raw request or linked request");
  }

  const requestId = entry.request.id;
  const requestResult = await safeGraphQL(
    () => sdk.graphql.request({ id: requestId }),
    "Failed to fetch replay entry request"
  );

  if (requestResult.kind === "Error") {
    return requestResult;
  }

  const request = requestResult.value.request;
  if (!isPresent(request)) {
    return Result.err("Replay entry request not found");
  }

  return Result.ok({
    entry: { ...entry, raw: request.raw },
    request,
  });
};

export async function getReplayEntryRequest(
  sdk: FrontendSDK,
  sessionId: string,
  entryId: string
): Promise<Result<ReplayEntryRequest>> {
  const sessionResult = await safeGraphQL(
    () => sdk.graphql.replaySessionEntries({ id: sessionId }),
    "Failed to fetch replay session entries"
  );

  if (sessionResult.kind === "Error") {
    return sessionResult;
  }

  const session = (sessionResult.value as ReplaySessionEntriesQuery).replaySession;
  if (!isPresent(session)) {
    return Result.err("Replay session not found");
  }

  const entries = [session.activeEntry, ...session.entries.edges.map((edge) => edge.node)].filter(
    isPresent
  );

  const selectedEntry = entries.find((entry) => matchesReplayEntryId(entry, entryId));
  const entry = toReplayHttpEntry(selectedEntry);
  if (!isPresent(entry)) {
    return Result.err("Replay entry is not an HTTP replay entry");
  }

  return hydrateReplayHttpEntry(sdk, entry);
}

const getRequestEditorRequestID = (): Result<string> => {
  const requestEditor = document.querySelector("[data-language=http-request]") as
    | EditorElement
    | undefined;

  if (!isPresent(requestEditor)) {
    return { kind: "Error", error: "Request editor not found" };
  }

  const root = requestEditor.closest("[data-request-id]");
  if (!isPresent(root)) {
    return { kind: "Error", error: "Request editor root element not found" };
  }

  const requestId = root.getAttribute("data-request-id");
  if (requestId === undefined || requestId === null || requestId === "") {
    return { kind: "Error", error: "Request ID attribute not found or empty" };
  }

  return { kind: "Ok", value: requestId };
};

export const getCurrentRequestID = async (sdk: FrontendSDK): Promise<Result<string>> => {
  const editorRequestIDResult = getRequestEditorRequestID();
  if (editorRequestIDResult.kind === "Ok") {
    return editorRequestIDResult;
  }

  const currSession = sdk.replay.getCurrentSession();
  if (!isPresent(currSession)) {
    return { kind: "Error", error: "No current replay session found" };
  }

  const sessionResult = await sdk.graphql.replaySessionEntries({
    id: currSession.id,
  });

  if (!isPresent(sessionResult.replaySession)) {
    return { kind: "Error", error: "Failed to fetch replay session entries" };
  }

  const activeEntry = sessionResult.replaySession.activeEntry;
  if (!isPresent(activeEntry)) {
    return { kind: "Error", error: "No active entry found in replay session" };
  }

  const entryResult = await getReplayEntryRequest(sdk, currSession.id, activeEntry.id);
  if (entryResult.kind === "Error") {
    return entryResult;
  }

  const requestId = entryResult.value.request?.id;
  if (requestId === undefined || requestId === null || requestId === "") {
    return { kind: "Error", error: "Request ID not found in active entry" };
  }

  return { kind: "Ok", value: requestId };
};

export interface EditorElement extends Element {
  cmView?: {
    view: EditorView;
  };
}

export async function getReplaySession(
  sdk: FrontendSDK,
  replaySessionId: string
): Promise<Result<ReplaySession>> {
  if (typeof replaySessionId !== "string") {
    return Result.err("replaySessionId must be a string");
  }

  const sessionResult = await sdk.graphql.replaySessionEntries({
    id: replaySessionId,
  });
  const activeEntry = sessionResult.replaySession?.activeEntry;

  if (activeEntry === undefined || activeEntry === null) {
    throw new Error("TODO: investigate this");
    // No active entry found, this is a new session
    // return Result.ok({
    //   id: replaySessionId,
    //   activeEntryId: "",
    //   request: {
    //     raw: "",
    //     host: "",
    //     port: 0,
    //     isTLS: false,
    //     SNI: "",
    //   },
    // });
  }

  const entryRequestResult = await getReplayEntryRequest(sdk, replaySessionId, activeEntry.id);
  if (entryRequestResult.kind === "Error") {
    return entryRequestResult;
  }

  const { entry } = entryRequestResult.value;

  return Result.ok({
    id: replaySessionId,
    activeEntryId: entry.id,
    request: {
      raw: entry.raw,
      host: entry.connection.host,
      port: entry.connection.port,
      isTLS: entry.connection.isTLS,
      SNI: entry.connection.SNI ?? "",
    },
  });
}

export const writeToRequestEditor = (raw: string) => {
  const requestEditor = document.querySelector(".cm-content[data-language='http-request']") as
    | EditorElement
    | undefined;

  if (!isPresent(requestEditor)) {
    return;
  }

  const requestEditorView = requestEditor?.cmView?.view;
  if (isPresent(requestEditorView)) {
    requestEditorView.dispatch({
      changes: { from: 0, to: requestEditorView.state.doc.length, insert: raw },
    });
  }
};

const readRequestEditor = (): Result<string> => {
  const requestEditors = document.querySelectorAll<EditorElement>(
    ".cm-content[data-language='http-request'], [data-language='http-request'] .cm-content, [data-language='http-request']"
  );

  let requestEditor: EditorElement | undefined;
  for (let i = 0; i < requestEditors.length; i++) {
    const candidate = requestEditors.item(i);
    if (isPresent(candidate.cmView?.view)) {
      requestEditor = candidate;
      break;
    }
  }

  if (!isPresent(requestEditor)) {
    return Result.err("Request editor not found");
  }

  const rawContent = requestEditor.cmView?.view.state.doc.toString();

  if (rawContent === undefined) {
    return Result.err("Unable to read request content");
  }

  let fixedContent = rawContent;
  if (rawContent !== "" && rawContent !== null) {
    fixedContent = rawContent.replace(/\r?\n/g, "\r\n");
  }

  return Result.ok(fixedContent);
};

export async function getSessionContent(
  sdk: FrontendSDK,
  sessionId: string
): Promise<Result<string>> {
  const currentSession = sdk.replay.getCurrentSession();
  if (isPresent(currentSession) && currentSession.id === sessionId) {
    const editorResult = readRequestEditor();
    if (editorResult.kind === "Ok") {
      return editorResult;
    }
  }

  const replayResult = await getReplaySession(sdk, sessionId);
  if (replayResult.kind === "Error") {
    return replayResult;
  }

  return Result.ok(replayResult.value.request.raw);
}
