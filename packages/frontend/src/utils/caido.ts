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

export type ReplaySession = {
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

  const requestId = activeEntry.request?.id;
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

  const entryResult = await sdk.graphql.replayEntry({
    id: activeEntry.id,
  });
  const replayEntry = entryResult.replayEntry;

  if (replayEntry === undefined || replayEntry === null) {
    return Result.err("No request found");
  }

  return Result.ok({
    id: replaySessionId,
    activeEntryId: activeEntry.id,
    request: {
      raw: replayEntry.raw,
      host: replayEntry.connection.host,
      port: replayEntry.connection.port,
      isTLS: replayEntry.connection.isTLS,
      SNI: replayEntry.connection.SNI ?? "",
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
  const requestEditor = document.querySelector(".cm-content[data-language='http-request']") as
    | EditorElement
    | undefined;

  if (!isPresent(requestEditor)) {
    return Result.err("Request editor not found");
  }

  // TODO: replace with proper SDK API call once we have it, we are hacking around to read content of editor
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
