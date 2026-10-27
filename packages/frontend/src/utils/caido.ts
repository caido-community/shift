import {
  type ConnectionInfoInput,
  type ReplayPlaceholderInput,
  type ReplayPreprocessorOptionsInput,
  type ReplaySessionEntriesQuery,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import { EditorView } from "@codemirror/view";
import { Result } from "shared";

import { isPresent, type UndefinedOrNull } from "./optional";

import { type FrontendSDK } from "@/types";

const decodeBlob = (encoded: string): string => {
  if (encoded === "") {
    return "";
  }

  const binary = atob(encoded);

  try {
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return binary;
  }
};

export const resolveEditorView = (el: Element | undefined): EditorView | undefined => {
  if (!isPresent(el)) {
    return undefined;
  }

  const fromDom =
    EditorView.findFromDOM(el as HTMLElement) ??
    (isPresent(el.closest(".cm-editor"))
      ? EditorView.findFromDOM(el.closest(".cm-editor") as HTMLElement)
      : undefined);
  if (isPresent(fromDom)) {
    return fromDom;
  }

  const anyEl = el as Element & {
    cmView?: { view?: EditorView };
    cmTile?: { view?: EditorView };
  };
  return anyEl.cmView?.view ?? anyEl.cmTile?.view;
};

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

type ReplayEntryHttp = {
  __typename: "ReplayEntry" | "ReplayEntryHttp";
  id: string;
  raw: string;
  connection: {
    host: string;
    port: number;
    isTLS: boolean;
    SNI?: string;
  };
  session: {
    id: string;
  };
  request?: {
    id: string;
    response?: {
      id: string;
    };
  };
  draft?:
    | {
        connection: Omit<ReplayEntryHttp["connection"], "SNI"> & { SNI?: string | UndefinedOrNull };
      }
    | UndefinedOrNull;
};

type ReplayEntryHttpInput = Omit<ReplayEntryHttp, "connection" | "request"> & {
  connection: Omit<ReplayEntryHttp["connection"], "SNI"> & {
    SNI?: unknown;
  };
  request?: unknown;
};

type ReplaySessionEntry = NonNullable<
  NonNullable<ReplaySessionEntriesQuery["replaySession"]>["activeEntry"]
>;

type EntryRequest = { id: string; response?: { id: string } | UndefinedOrNull } | UndefinedOrNull;
export type AnyReplayEntry =
  | { __typename: "ReplayEntryHttp"; request?: EntryRequest }
  | { __typename: "ReplayEntryWs"; http: { request?: EntryRequest } }
  | {
      __typename: "ReplayEntryHttpOnePipeline";
      activeHttpEntry?: { request?: EntryRequest } | UndefinedOrNull;
    };

export const getActiveEntryRequest = (entry: AnyReplayEntry | UndefinedOrNull) => {
  switch (entry?.__typename) {
    case "ReplayEntryHttp":
      return entry.request ?? undefined;
    case "ReplayEntryWs":
      return entry.http.request ?? undefined;
    case "ReplayEntryHttpOnePipeline":
      return entry.activeHttpEntry?.request ?? undefined;
    default:
      return undefined;
  }
};

export type ReplayEntryWithRequest = {
  entry: ReplayEntryHttp;
  request: ReplayEntryHttp["request"];
};

const normalizeReplayEntryHttp = (entry: ReplayEntryHttpInput): ReplayEntryHttp => {
  let request: ReplayEntryHttp["request"] = undefined;
  if (typeof entry.request === "object" && isPresent(entry.request)) {
    const entryRequest = entry.request as { id?: unknown; response?: unknown };
    let response: { id: string } | undefined = undefined;

    if (typeof entryRequest.response === "object" && isPresent(entryRequest.response)) {
      const entryResponse = entryRequest.response as { id?: unknown };
      if (typeof entryResponse.id === "string") {
        response = { id: entryResponse.id };
      }
    }

    if (typeof entryRequest.id === "string") {
      request = {
        id: entryRequest.id,
        response,
      };
    }
  }

  return {
    ...entry,
    raw: decodeBlob(entry.raw),
    connection: {
      ...entry.connection,
      SNI: typeof entry.connection.SNI === "string" ? entry.connection.SNI : undefined,
    },
    request,
  };
};

const toSessionReplayEntryHttp = (entry: ReplaySessionEntry): ReplayEntryHttp | undefined => {
  switch (entry.__typename) {
    case "ReplayEntryWs":
      return normalizeReplayEntryHttp(entry.http);
    case "ReplayEntryHttpOnePipeline":
      return isPresent(entry.activeHttpEntry)
        ? normalizeReplayEntryHttp(entry.activeHttpEntry)
        : undefined;
    default:
      return normalizeReplayEntryHttp(entry);
  }
};

const fetchReplaySession = (sdk: FrontendSDK, sessionId: string) =>
  safeGraphQL(
    () => sdk.graphql.replaySessionEntries({ id: sessionId }),
    "Failed to fetch replay session entries"
  );

const toReplayEntryWithRequest = (
  sessionEntry: ReplaySessionEntry
): Result<ReplayEntryWithRequest> => {
  const entry = toSessionReplayEntryHttp(sessionEntry);
  if (entry === undefined) {
    return Result.err("Replay entry has no HTTP request");
  }
  return Result.ok({ entry, request: entry.request });
};

export const getReplayEntryRequest = async (
  sdk: FrontendSDK,
  entryId: string,
  sessionId: string
): Promise<Result<ReplayEntryWithRequest>> => {
  const sessionResult = await fetchReplaySession(sdk, sessionId);
  if (sessionResult.kind === "Error") {
    return sessionResult;
  }

  const session = sessionResult.value.replaySession;
  if (!isPresent(session)) {
    return Result.err("Replay session not found");
  }

  const selectedEntry =
    (session.activeEntry?.id === entryId ? session.activeEntry : undefined) ??
    session.entries.edges.find((e) => e.node.id === entryId)?.node;

  if (!isPresent(selectedEntry)) {
    return Result.err("Replay entry not found");
  }
  return toReplayEntryWithRequest(selectedEntry);
};

const getActiveReplayEntry = async (
  sdk: FrontendSDK,
  sessionId: string
): Promise<Result<(ReplayEntryWithRequest & { activeEntryId: string }) | undefined>> => {
  const sessionResult = await fetchReplaySession(sdk, sessionId);
  if (sessionResult.kind === "Error") {
    return sessionResult;
  }

  const activeEntry = sessionResult.value.replaySession?.activeEntry;
  if (!isPresent(activeEntry)) {
    return Result.ok(undefined);
  }

  const entryResult = toReplayEntryWithRequest(activeEntry);
  if (entryResult.kind === "Error") {
    return entryResult;
  }
  return Result.ok({ ...entryResult.value, activeEntryId: activeEntry.id });
};

const getSelectedRequest = (sdk: FrontendSDK) => {
  switch (sdk.window.getContext().page?.kind) {
    case "Replay":
      return sdk.replay.getSelectedRequest();
    case "HTTPHistory":
      return sdk.httpHistory.getSelectedRequest();
    case "Intercept":
      return sdk.intercept.getSelectedRequest();
    case "Sitemap":
      return sdk.sitemap.getSelectedRequest();
    case "Search":
      return sdk.search.getSelectedRequest();
    case "Automate":
      return sdk.automate.getSelectedRequest();
    case "Findings":
      return sdk.findings.getSelectedRequest();
    default:
      return undefined;
  }
};

export const getCurrentRequestID = (sdk: FrontendSDK): Result<string> => {
  const request = getSelectedRequest(sdk);
  return request === undefined ? Result.err("No request is selected") : Result.ok(request.id);
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
  const entryResult = await getActiveReplayEntry(sdk, replaySessionId);
  if (entryResult.kind === "Error") {
    return entryResult;
  }
  if (entryResult.value === undefined) {
    return Result.ok({
      id: replaySessionId,
      activeEntryId: "",
      request: {
        raw: "",
        host: "",
        port: 0,
        isTLS: false,
        SNI: "",
      },
    });
  }

  const replayEntry = entryResult.value.entry;
  const connection = replayEntry.draft?.connection ?? replayEntry.connection;

  return Result.ok({
    id: replaySessionId,
    activeEntryId: entryResult.value.activeEntryId,
    request: {
      raw: replayEntry.raw,
      host: connection.host,
      port: connection.port,
      isTLS: connection.isTLS,
      SNI: connection.SNI ?? "",
    },
  });
}

export async function setActiveEntryDraftRaw(
  sdk: FrontendSDK,
  session: ReplaySession,
  raw: string
): Promise<Result<void>> {
  const result = await safeGraphQL(
    () =>
      sdk.graphql.updateReplayEntryDraft({
        id: session.activeEntryId,
        input: {
          http: {
            raw,
            connection: {
              host: session.request.host,
              port: session.request.port,
              isTLS: session.request.isTLS,
              SNI: session.request.SNI !== "" ? session.request.SNI : undefined,
            },
            settings: { placeholders: [] },
            editorState: "",
          },
        },
      }),
    "Failed to update replay entry draft"
  );

  if (result.kind === "Error") {
    return result;
  }

  return Result.ok(undefined);
}

type ReplayPlaceholder = Extract<
  NonNullable<NonNullable<ReplaySessionEntriesQuery["replaySession"]>["activeEntry"]>,
  { __typename: "ReplayEntryHttp" }
>["settings"]["placeholders"][number];

const toPreprocessorOptionsInput = (
  options: ReplayPlaceholder["preprocessors"][number]["options"]
): ReplayPreprocessorOptionsInput => {
  switch (options.__typename) {
    case "ReplayEnvironmentPreprocessor":
      return { environment: { variableName: options.variableName } };
    case "ReplayPrefixPreprocessor":
      return { prefix: { value: options.value } };
    case "ReplaySuffixPreprocessor":
      return { suffix: { value: options.value } };
    case "ReplayUrlEncodePreprocessor":
      return { urlEncode: { charset: options.charset, nonAscii: options.nonAscii } };
    case "ReplayWorkflowPreprocessor":
      return { workflow: { id: options.id } };
  }
};

const toPlaceholderInput = (placeholder: ReplayPlaceholder): ReplayPlaceholderInput => ({
  inputRange: { start: placeholder.inputRange.start, end: placeholder.inputRange.end },
  outputRange: { start: placeholder.outputRange.start, end: placeholder.outputRange.end },
  preprocessors: placeholder.preprocessors.map((preprocessor) => ({
    options: toPreprocessorOptionsInput(preprocessor.options),
  })),
});

const getActiveHttpEntry = async (sdk: FrontendSDK, sessionId: string) => {
  const sessionResult = await fetchReplaySession(sdk, sessionId);
  if (sessionResult.kind === "Error") {
    return sessionResult;
  }

  const session = sessionResult.value.replaySession;
  if (!isPresent(session)) {
    return Result.err("Replay session not found");
  }
  if (!isPresent(session.activeEntry)) {
    return Result.err("Replay session has no active entry");
  }
  if (session.activeEntry.__typename !== "ReplayEntryHttp") {
    return Result.err("The active replay entry is not an HTTP request");
  }

  return Result.ok(session.activeEntry);
};

const readOpenRequestEditorDoc = (sdk: FrontendSDK, sessionId: string): string | undefined => {
  if (sdk.replay.getCurrentSession()?.id !== sessionId || location.hash !== "#/replay") {
    return undefined;
  }

  const requestEditor = document.querySelector(".cm-content[data-language='http-request']");
  return resolveEditorView(requestEditor ?? undefined)?.state.sliceDoc();
};

const DRAFT_AUTOSAVE_WAIT_MS = 3500;

export async function setReplaySessionConnection(
  sdk: FrontendSDK,
  sessionId: string,
  connection: ConnectionInfoInput
): Promise<Result<void>> {
  let entryResult = await getActiveHttpEntry(sdk, sessionId);
  if (entryResult.kind === "Error") {
    return entryResult;
  }

  // The editor may show pretty-printed text, so only the saved draft has the exact request bytes.
  // Unsaved edits reach the draft through Caido's autosave (debounced up to 3s), so wait for it.
  const deadline = Date.now() + DRAFT_AUTOSAVE_WAIT_MS;
  let editorDoc = readOpenRequestEditorDoc(sdk, sessionId);
  while (
    editorDoc !== undefined &&
    editorDoc !== decodeBlob((entryResult.value.draft ?? entryResult.value).raw) &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    entryResult = await getActiveHttpEntry(sdk, sessionId);
    if (entryResult.kind === "Error") {
      return entryResult;
    }
    editorDoc = readOpenRequestEditorDoc(sdk, sessionId);
  }

  const entry = entryResult.value;
  const stored = entry.draft ?? entry;
  const result = await safeGraphQL(
    () =>
      sdk.graphql.updateReplayEntryDraft({
        id: entry.id,
        input: {
          http: {
            raw: decodeBlob(stored.raw),
            connection,
            settings: { placeholders: stored.settings.placeholders.map(toPlaceholderInput) },
            editorState: entry.draft?.editorState ?? "",
          },
        },
      }),
    "Failed to update replay entry draft"
  );
  if (result.kind === "Error") {
    return result;
  }

  if (sdk.replay.getCurrentSession()?.id !== sessionId) {
    return Result.ok(undefined);
  }

  const editorDocAfter = readOpenRequestEditorDoc(sdk, sessionId);
  if (editorDocAfter !== undefined && editorDocAfter !== editorDoc) {
    return Result.err("The request was edited while changing the target; try again");
  }

  // Reload the open tab, otherwise Caido's next send saves its in-memory connection over the draft.
  await sdk.replay.showEntry(sessionId, entry.id);

  return Result.ok(undefined);
}

export async function startReplayTaskDirect(
  sdk: FrontendSDK,
  sessionId: string
): Promise<Result<void>> {
  const result = await safeGraphQL(
    () => sdk.graphql.startReplayTask({ sessionId }),
    "Failed to start replay task"
  );

  if (result.kind === "Error") {
    return result;
  }

  const taskError = result.value.startReplayTask.error;
  if (isPresent(taskError)) {
    return Result.err(`Replay task failed to start: ${taskError.code}`);
  }

  return Result.ok(undefined);
}

export const writeToRequestEditor = (raw: string) => {
  const requestEditor = document.querySelector(".cm-content[data-language='http-request']");

  if (!isPresent(requestEditor)) {
    return;
  }

  const requestEditorView = resolveEditorView(requestEditor);
  if (isPresent(requestEditorView)) {
    requestEditorView.dispatch({
      changes: { from: 0, to: requestEditorView.state.doc.length, insert: raw },
    });
  }
};

const readRequestEditor = (): Result<string> => {
  const requestEditor = document.querySelector(".cm-content[data-language='http-request']");

  if (!isPresent(requestEditor)) {
    return Result.err("Request editor not found");
  }

  // TODO: replace with proper SDK API call once we have it, we are hacking around to read content of editor
  const rawContent = resolveEditorView(requestEditor)?.state.doc.toString();

  if (rawContent === undefined) {
    return Result.err("Unable to read request content");
  }

  return Result.ok(rawContent.replace(/\r?\n/g, "\r\n"));
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
