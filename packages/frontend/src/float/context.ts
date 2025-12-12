import { type EditorView } from "@codemirror/view";

import { type ActionContext } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { type EditorElement } from "@/utils";

// TODO: we rely a lot on the DOM of Caido, we could create a test suite that would test different pages to make sure the elements we use exist

const getBaseContext = (sdk: FrontendSDK): ActionContext => {
  const getActiveProject = () => {
    const projectNameElement = document.querySelector(
      ".c-current-project[data-project-id]",
    ) as HTMLElement | undefined;

    if (projectNameElement === undefined) {
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
    const requestEditor = document.querySelector(
      ".cm-content[data-language='http-request']",
    ) as EditorElement | undefined;
    const responseEditor = document.querySelector(
      ".cm-content[data-language='http-response']",
    ) as EditorElement | undefined;

    const requestEditorView = requestEditor?.cmView?.view;
    const responseEditorView = responseEditor?.cmView?.view;

    const getSelectedText = (editor: EditorView | undefined) => {
      if (editor) {
        const { from, to } = editor.state.selection.main;
        return editor.state.sliceDoc(from, to);
      }

      return undefined;
    };

    return {
      requestEditor: {
        raw:
          requestEditor?.cmView?.view.state.doc.toString() ??
          "No request editor found",
        selection:
          getSelectedText(requestEditorView) ??
          "No selection in request editor",
      },
      responseEditor: {
        raw:
          responseEditor?.cmView?.view.state.doc.toString() ??
          "No response editor found",
        selection:
          getSelectedText(responseEditorView) ??
          "No selection in response editor",
      },
    };
  };

  const activeEditor = () => {
    const activeEditor = sdk.window.getActiveEditor();
    if (activeEditor === undefined) {
      return "No editor is selected";
    }

    const dataLanguageElement = activeEditor
      .getEditorView()
      .dom.querySelector("[data-language]");

    if (dataLanguageElement === null) {
      return "No editor is selected";
    }

    const language = dataLanguageElement.getAttribute("data-language");
    if (language === null) {
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
    if (selection !== null && selection.rangeCount > 0) {
      const str = selection.toString();
      if (str.length > 0) {
        return str;
      }
    }

    const activeEditor = sdk.window.getActiveEditor();
    if (activeEditor === undefined) {
      return "No text is selected";
    }

    const selectedText = activeEditor.getSelectedText();
    if (selectedText === undefined || selectedText.length === 0) {
      return "No text is selected";
    }

    return selectedText;
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
      value: window.location.hash,
    },
    selection: {
      description: "The text that user has currently selected",
      value: getSelection(),
    },
    editors: {
      description:
        "Information about the active HTTP request and response editors.",
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
      description:
        "Global and selected environments including their current variables",
      value: getEnvironments(),
    },
  };

  return context;
};

const getAutomateContext = (sdk: FrontendSDK): ActionContext => {
  const getSelectedAutomateTab = () => {
    const activeTab = document.querySelector(
      '[data-is-selected="true"][data-session-id]',
    );
    return activeTab ? activeTab.textContent : undefined;
  };

  const getSelectedAutomateTabSessionId = () => {
    const activeTab = document.querySelector(
      '[data-is-selected="true"][data-session-id]',
    );
    return activeTab ? activeTab.getAttribute("data-session-id") : undefined;
  };

  return {
    automate: {
      description: "The current state of the #/automate page",
      value: {
        tab: getSelectedAutomateTab() ?? "No tab selected",
        sessionId: getSelectedAutomateTabSessionId() ?? "No session id",
      },
    },
  };
};

const getReplayContext = (sdk: FrontendSDK): ActionContext => {
  const getCurrentlySelectedReplayTab = () => {
    const currentSession = sdk.replay.getCurrentSession();
    if (currentSession !== undefined) {
      return currentSession.name;
    }

    return "No session selected";
  };

  const getCurrentlySelectedReplayTabSessionId = () => {
    const currentSession = sdk.replay.getCurrentSession();
    if (currentSession !== undefined) {
      return currentSession.id;
    }

    return "No session id";
  };

  return {
    replay: {
      description: "The current state of the #/replay page",
      value: {
        tab: getCurrentlySelectedReplayTab() ?? "No tab selected",
        sessionId: getCurrentlySelectedReplayTabSessionId() ?? "No session id",
      },
    },
  };
};

const getHttpHistoryContext = (sdk: FrontendSDK): ActionContext => {
  const getHttpQLQuery = () => {
    return sdk.httpHistory.getQuery();
  };

  // TODO: broken since table is a virtual list, if user scrolls the table, the row will be gone
  const getCurrentRow = () => {
    const selectedRow = document.querySelector(
      '.c-table__item-row[data-is-selected="true"]',
    );

    if (!selectedRow) {
      return {};
    }

    const headerRow = document.querySelector(".c-table__header-row");
    if (!headerRow) {
      return {};
    }

    const cellValues = Array.from(
      selectedRow.querySelectorAll(".c-item-cell__inner"),
    ).map((cell) => cell.textContent ?? "");

    const headerValues = Array.from(
      headerRow.querySelectorAll(".c-header-cell__content"),
    ).map((header) => header.textContent ?? "");

    const rowData: Record<string, string> = {};
    headerValues.forEach((header, index) => {
      rowData[header] = cellValues[index] ?? "";
    });

    return rowData;
  };

  return {
    httpHistory: {
      description: "The current state of the #/http-history page",
      value: {
        query: getHttpQLQuery(),
        currentRowData: getCurrentRow(),
      },
    },
  };
};

export const getContext = (sdk: FrontendSDK): ActionContext => {
  const context: ActionContext = {};

  const baseContext = getBaseContext(sdk);
  Object.assign(context, baseContext);

  if (window.location.hash === "#/automate") {
    const automateContext = getAutomateContext(sdk);
    Object.assign(context, automateContext);
  }

  if (window.location.hash === "#/replay") {
    const replayContext = getReplayContext(sdk);
    Object.assign(context, replayContext);
  }

  if (window.location.hash === "#/http-history") {
    const httpHistoryContext = getHttpHistoryContext(sdk);
    Object.assign(context, httpHistoryContext);
  }

  return context;
};
