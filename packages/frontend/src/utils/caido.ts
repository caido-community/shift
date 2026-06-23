import { EditorView } from "@codemirror/view";
import { Result } from "shared";

import { isPresent } from "./optional";

import { type FrontendSDK } from "@/types";

export const decodeBlob = (encoded: string): string => {
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
};

type ReplayEntryHttpInput = Omit<ReplayEntryHttp, "connection" | "request"> & {
  connection: Omit<ReplayEntryHttp["connection"], "SNI"> & {
    SNI?: unknown;
  };
  request?: unknown;
};

type LegacyReplayEntryQuery = {
  replayEntry?: ReplayEntryHttp;
};

type LegacyReplayEntryVariables = {
  id: string;
};

type LegacyReplayEntryFn = (
  variables: LegacyReplayEntryVariables
) => Promise<LegacyReplayEntryQuery>;

type ReplaySessionEntriesResult = Awaited<
  ReturnType<FrontendSDK["graphql"]["replaySessionEntries"]>
>;
type ReplaySessionEntry = NonNullable<
  NonNullable<ReplaySessionEntriesResult["replaySession"]>["activeEntry"]
>;
type ReplaySessionEntryLike = ReplaySessionEntry;

export type ReplayEntryWithRequest = {
  entry: ReplayEntryHttp;
  request: ReplayEntryHttp["request"];
};

const getMajorMinorPatch = (version: string): [number, number, number] => {
  const [major = "0", minor = "0", patch = "0"] = version.split(/[.-]/);
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
};

const isVersionAtLeast = (version: string, minimum: [number, number, number]): boolean => {
  const current = getMajorMinorPatch(version);

  for (let index = 0; index < minimum.length; index++) {
    const currentPart = current[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }

  return true;
};

export const usesReplayEntryInterface = (sdk: FrontendSDK): boolean =>
  isVersionAtLeast(sdk.runtime.version, [0, 57, 0]);

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
    connection: {
      ...entry.connection,
      SNI: typeof entry.connection.SNI === "string" ? entry.connection.SNI : undefined,
    },
    request,
  };
};

const toSessionReplayEntryHttp = (entry: ReplaySessionEntryLike): ReplayEntryHttp =>
  normalizeReplayEntryHttp(entry.__typename === "ReplayEntryWs" ? entry.http : entry);

const getConcreteReplayEntry = async (
  sdk: FrontendSDK,
  entryId: string
): Promise<Result<ReplayEntryWithRequest>> => {
  const replayEntry = sdk.graphql.replayEntry as unknown as LegacyReplayEntryFn;
  const result = await safeGraphQL(
    () => replayEntry({ id: entryId }),
    "Failed to fetch replay entry"
  );

  if (result.kind === "Error") {
    return result;
  }

  const entry = result.value.replayEntry;
  if (!isPresent(entry)) {
    return Result.err("Replay entry not found");
  }

  const normalizedEntry = normalizeReplayEntryHttp(entry);
  return Result.ok({ entry: normalizedEntry, request: normalizedEntry.request });
};

const getInterfaceReplayEntry = async (
  sdk: FrontendSDK,
  sessionId: string,
  entryId: string
): Promise<Result<ReplayEntryWithRequest>> => {
  const result = await safeGraphQL(
    () => sdk.graphql.replaySessionEntries({ id: sessionId }),
    "Failed to fetch replay session entries"
  );

  if (result.kind === "Error") {
    return result;
  }

  const session = result.value.replaySession;
  if (!isPresent(session)) {
    return Result.err("Replay session not found");
  }

  const selectedEntry =
    (session.activeEntry?.id === entryId ? session.activeEntry : undefined) ??
    session.entries.edges.find((e) => e.node.id === entryId)?.node;

  if (!isPresent(selectedEntry)) {
    return Result.err("Replay entry not found");
  }

  const entry = toSessionReplayEntryHttp(selectedEntry);
  return Result.ok({ entry, request: entry.request });
};

export const getReplayEntryRequest = async (
  sdk: FrontendSDK,
  entryId: string,
  sessionId: string
): Promise<Result<ReplayEntryWithRequest>> => {
  if (usesReplayEntryInterface(sdk)) {
    return getInterfaceReplayEntry(sdk, sessionId, entryId);
  }

  return getConcreteReplayEntry(sdk, entryId);
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

  const entryResult = await getReplayEntryRequest(sdk, activeEntry.id, currSession.id);
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

  const entryResult = await getReplayEntryRequest(sdk, activeEntry.id, replaySessionId);
  if (entryResult.kind === "Error") {
    return entryResult;
  }

  const replayEntry = entryResult.value.entry;

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
  const requestEditor = document.querySelector(".cm-content[data-language='http-request']") as
    | EditorElement
    | undefined;

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
  const requestEditor = document.querySelector(".cm-content[data-language='http-request']") as
    | EditorElement
    | undefined;

  if (!isPresent(requestEditor)) {
    return Result.err("Request editor not found");
  }

  // TODO: replace with proper SDK API call once we have it, we are hacking around to read content of editor
  const rawContent = resolveEditorView(requestEditor)?.state.doc.toString();

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
