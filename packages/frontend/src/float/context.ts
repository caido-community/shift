import {
  type AutomatePageContext,
  type GlobalContext,
  type HTTPHistoryPageContext,
  type ReplayPageContext,
} from "@caido/sdk-frontend";
import { type EditorView } from "@codemirror/view";

import { type ActionContext } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { type EditorElement, isPresent } from "@/utils";

const MAX_CONTEXT_LENGTH = 10_000;

const truncate = (value: string, maxLength = MAX_CONTEXT_LENGTH): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}... [truncated, ${value.length - maxLength} more characters]`;
};

const getBaseContext = (sdk: FrontendSDK, globalContext: GlobalContext): ActionContext => {
  const getActiveProject = () => {
    const projectNameElement = document.querySelector(".c-current-project[data-project-id]") as
      | HTMLElement
      | undefined;

    if (!isPresent(projectNameElement)) {
      return {
        name: "No project selected",
        id: "",
      };
    }

    const id = projectNameElement.getAttribute("data-project-id");
    const name = projectNameElement.innerText;

    return {
      name: name,
      id: id ?? "",
    };
  };

  const getScopes = () => {
    return sdk.scopes.getScopes();
  };

  const getFilters = () => {
    return sdk.filters.getAll();
  };

  const getEditorsInfo = () => {
    const requestEditor = document.querySelector(".cm-content[data-language='http-request']") as
      | EditorElement
      | undefined;
    const responseEditor = document.querySelector(".cm-content[data-language='http-response']") as
      | EditorElement
      | undefined;

    const requestEditorView = requestEditor?.cmView?.view;
    const responseEditorView = responseEditor?.cmView?.view;

    const getSelectedText = (editor: EditorView | undefined) => {
      if (isPresent(editor)) {
        const { from, to } = editor.state.selection.main;
        return editor.state.sliceDoc(from, to);
      }

      return undefined;
    };

    const requestRaw = requestEditor?.cmView?.view.state.doc.toString();
    const responseRaw = responseEditor?.cmView?.view.state.doc.toString();
    const requestSelection = getSelectedText(requestEditorView);
    const responseSelection = getSelectedText(responseEditorView);

    return {
      requestEditor: {
        raw: isPresent(requestRaw) ? truncate(requestRaw) : "No request editor found",
        selection: isPresent(requestSelection)
          ? truncate(requestSelection)
          : "No selection in request editor",
      },
      responseEditor: {
        raw: isPresent(responseRaw) ? truncate(responseRaw) : "No response editor found",
        selection: isPresent(responseSelection)
          ? truncate(responseSelection)
          : "No selection in response editor",
      },
    };
  };

  const activeEditor = () => {
    const activeEditor = sdk.window.getActiveEditor();
    if (!isPresent(activeEditor)) {
      return "No editor is selected";
    }

    const dataLanguageElement = activeEditor.getEditorView().dom.querySelector("[data-language]");

    if (!isPresent(dataLanguageElement)) {
      return "No editor is selected";
    }

    const language = dataLanguageElement.getAttribute("data-language");
    if (!isPresent(language)) {
      return "No editor is selected";
    }

    switch (language) {
      case "http-request":
        return "request";
      case "http-response":
        return "response";
      default:
        return "No editor is selected";
    }
  };

  const getSelection = () => {
    const selection = window.getSelection();
    if (isPresent(selection) && selection.rangeCount > 0) {
      const str = selection.toString();
      if (str.length > 0) {
        return truncate(str);
      }
    }

    const activeEditor = sdk.window.getActiveEditor();
    if (!isPresent(activeEditor)) {
      return "No text is selected";
    }

    const selectedText = activeEditor.getSelectedText();
    if (!isPresent(selectedText) || selectedText.length === 0) {
      return "No text is selected";
    }

    return truncate(selectedText);
  };

  const getHostedFiles = () => {
    return sdk.files.getAll();
  };

  const getWorkflows = () => {
    return sdk.workflows.getWorkflows();
  };

  const getEnvironments = async () => {
    try {
      const result = await sdk.graphql.environmentContext();
      return result?.environmentContext ?? "No environments available";
    } catch (error) {
      return `Failed to fetch environments: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  };

  const context: ActionContext = {
    page: {
      description: "The page you are currently on",
      value: globalContext.page?.kind ?? "Unknown",
    },
    selection: {
      description: "The text that user has currently selected",
      value: getSelection(),
    },
    editors: {
      description: "Information about the active HTTP request and response editors.",
      value: getEditorsInfo(),
    },
    activeEditor: {
      description: "The currently selected editor.",
      value: activeEditor(),
    },
    project: {
      description: "The NAME and ID of the active project",
      value: getActiveProject(),
    },
    scopes: {
      description: "List of all scopes",
      value: getScopes(),
    },
    filters: {
      description: "List of all filters",
      value: getFilters(),
    },
    files: {
      description: "List of all hosted files",
      value: getHostedFiles(),
    },
    workflows: {
      description: "List of all workflows",
      value: getWorkflows(),
    },
    environments: {
      description: "Global and selected environments including their current variables",
      value: getEnvironments(),
    },
  };

  return context;
};

const getAutomateContext = (sdk: FrontendSDK, pageContext: AutomatePageContext): ActionContext => {
  const getSelectedSession = () => {
    if (pageContext.selection.kind === "Empty") {
      return { name: "No session selected", id: undefined };
    }

    const selected = pageContext.selection.main;
    if (selected.kind === "AutomateSession") {
      const session = sdk.automate.getSessions().find((s) => s.id === selected.id);
      return { name: session?.name ?? "Unknown session", id: selected.id };
    }

    if (selected.kind === "AutomateEntry") {
      const sessions = sdk.automate.getSessions();
      for (const session of sessions) {
        const entries = sdk.automate.getEntries(session.id);
        const entry = entries.find((e) => e.id === selected.id);
        if (isPresent(entry)) {
          return { name: entry.name, id: selected.id, sessionId: session.id };
        }
      }
      return { name: "Unknown entry", id: selected.id };
    }

    return { name: "No session selected", id: undefined };
  };

  return {
    automate: {
      description: "The current state of the Automate page",
      value: getSelectedSession(),
    },
  };
};

const getReplayContext = (sdk: FrontendSDK, pageContext: ReplayPageContext): ActionContext => {
  const getSelectedSession = () => {
    if (pageContext.selection.kind === "Empty") {
      return { name: "No session selected", id: undefined };
    }

    const sessionId = pageContext.selection.main;
    const session = sdk.replay.getSessions().find((s) => s.id === sessionId);
    return {
      name: session?.name ?? "Unknown session",
      id: sessionId,
    };
  };

  return {
    replay: {
      description: "The current state of the Replay page",
      value: getSelectedSession(),
    },
  };
};

const getHttpHistoryContext = (
  sdk: FrontendSDK,
  pageContext: HTTPHistoryPageContext
): ActionContext => {
  const getSelection = () => {
    if (pageContext.selection.kind === "Empty") {
      return { selectedRequestIds: [] };
    }

    const allSelected = [pageContext.selection.main, ...pageContext.selection.secondary];
    return { selectedRequestIds: allSelected };
  };

  return {
    httpHistory: {
      description: "The current state of the HTTP History page",
      value: {
        query: sdk.httpHistory.getQuery(),
        ...getSelection(),
      },
    },
  };
};

export const getContext = (sdk: FrontendSDK): ActionContext => {
  const globalContext = sdk.window.getContext();
  const pageContext = globalContext.page;

  const context: ActionContext = {};

  const baseContext = getBaseContext(sdk, globalContext);
  Object.assign(context, baseContext);

  if (pageContext?.kind === "Automate") {
    const automateContext = getAutomateContext(sdk, pageContext);
    Object.assign(context, automateContext);
  }

  if (pageContext?.kind === "Replay") {
    const replayContext = getReplayContext(sdk, pageContext);
    Object.assign(context, replayContext);
  }

  if (pageContext?.kind === "HTTPHistory") {
    const httpHistoryContext = getHttpHistoryContext(sdk, pageContext);
    Object.assign(context, httpHistoryContext);
  }

  return context;
};
