import { type EditorView } from "@codemirror/view";

import { type ReplaySession } from "@/agents/types";
import { type FrontendSDK } from "@/types";

export const getSelectedReplayTabSessionId = () => {
  const activeTab = document.querySelector(
    '[data-is-selected="true"][data-session-id]',
  );
  return activeTab ? activeTab.getAttribute("data-session-id") : "";
};

const getRequestEditorRequestID = () => {
  const requestEditor = document.querySelector("[data-language=http-request]");

  if (requestEditor === null) {
    return undefined;
  }

  const root = requestEditor.closest("[data-request-id]");
  if (root === null) {
    return undefined;
  }

  return root.getAttribute("data-request-id") ?? undefined;
};

export const getCurrentRequestID = async (sdk: FrontendSDK) => {
  const editorRequestID = getRequestEditorRequestID();
  if (editorRequestID !== undefined) {
    return editorRequestID;
  }

  const selectedSessionID = getSelectedReplayTabSessionId();
  if (selectedSessionID === undefined || selectedSessionID === null) {
    return undefined;
  }

  const sessionResult = await sdk.graphql.replaySessionEntries({
    id: selectedSessionID,
  });
  const activeEntry = sessionResult.replaySession?.activeEntry;

  if (activeEntry === undefined || activeEntry === null) {
    return undefined;
  }

  return activeEntry.request?.id ?? undefined;
};

type ReplayRequest =
  | {
      kind: "Ok";
      session: ReplaySession;
    }
  | {
      kind: "Error";
      error: string;
    };

export async function getReplaySession(
  sdk: FrontendSDK,
  replaySessionId: string,
): Promise<ReplayRequest> {
  if (typeof replaySessionId !== "string") {
    return {
      kind: "Error",
      error: "replaySessionId must be a string",
    };
  }

  const sessionResult = await sdk.graphql.replaySessionEntries({
    id: replaySessionId,
  });
  const activeEntry = sessionResult.replaySession?.activeEntry;

  if (activeEntry === undefined || activeEntry === null) {
    // No active entry found, this is a new session
    return {
      kind: "Ok",
      session: {
        id: replaySessionId,
        activeEntryId: "",
        request: {
          raw: "",
          host: "",
          port: 0,
          isTLS: false,
          SNI: "",
        },
      },
    } as ReplayRequest;
  }

  const entryResult = await sdk.graphql.replayEntry({
    id: activeEntry.id,
  });
  const replayEntry = entryResult.replayEntry;

  if (replayEntry === undefined || replayEntry === null) {
    return {
      kind: "Error",
      error: "No request found",
    };
  }

  return {
    kind: "Ok",
    session: {
      id: replaySessionId,
      activeEntryId: activeEntry.id,
      request: {
        raw: replayEntry.raw,
        host: replayEntry.connection.host,
        port: replayEntry.connection.port,
        isTLS: replayEntry.connection.isTLS,
        SNI: replayEntry.connection.SNI,
      },
    },
  } as ReplayRequest;
}

export const writeToRequestEditor = (raw: string) => {
  const requestEditor = document.querySelector(
    ".cm-content[data-language='http-request']",
  ) as EditorElement | undefined;

  const requestEditorView = requestEditor?.cmView?.view;
  if (requestEditorView !== undefined) {
    requestEditorView.dispatch({
      changes: { from: 0, to: requestEditorView.state.doc.length, insert: raw },
    });
  }
};

export interface EditorElement extends Element {
  cmView?: {
    view: EditorView;
  };
}
