import type { Caido } from "@caido/sdk-frontend";
import type { PluginStorage } from "../constants";
import { DEFAULT_PLUGIN_STORAGE } from "../constants";
import logger from "./logger";

//utils
const getSelectedText = (editor: any) => {
  if (editor) {
    const { from, to } = editor.state.selection.main;
    return editor.state.sliceDoc(from, to);
  }
  return undefined;
};
export const getCurrentSearchEditors = () => {
  if (window.location.hash.split("?")[0] !== "#/search") {
    return {
      requestEditor: undefined,
      responseEditor: undefined,
      request: undefined,
      response: undefined,
      requestSelectedText: undefined,
      responseSelectedText: undefined,
      focused: undefined,
    };
  }

  const requestEditor = (
    document.querySelector(".c-read-only-request .cm-content") as any
  )?.cmView?.view;
  const responseEditor = (
    document.querySelector(".c-response__response .cm-content") as any
  )?.cmView?.view;
  const focusedEditor = (
    document.querySelector(".cm-editor.cm-focused .cm-content") as any
  )?.cmView?.view;
  let focused = undefined;
  if (focusedEditor === requestEditor) {
    focused = "request";
  } else if (focusedEditor === responseEditor) {
    focused = "response";
  }

  return {
    requestEditor,
    responseEditor,
    request: requestEditor?.state.doc.toString(),
    response: responseEditor?.state.doc.toString(),
    requestSelectedText: getSelectedText(requestEditor),
    responseSelectedText: getSelectedText(responseEditor),
    focused,
  };
};

export const getCurrentInterceptEditors = () => {
  if (window.location.hash.split("?")[0] !== "#/intercept") {
    return {
      requestEditor: undefined,
      responseEditor: undefined,
      request: undefined,
      response: undefined,
      requestSelectedText: undefined,
      responseSelectedText: undefined,
      focused: undefined,
    };
  }

  const requestEditor = (
    document.querySelector(".c-writable-request .cm-content") as any
  )?.cmView?.view;
  const responseEditor = (
    document.querySelector(".c-writable-response .cm-content") as any
  )?.cmView?.view;
  const focusedEditor = (
    document.querySelector(".cm-editor.cm-focused .cm-content") as any
  )?.cmView?.view;
  let focused = undefined;
  if (focusedEditor === requestEditor) {
    focused = "request";
  } else if (focusedEditor === responseEditor) {
    focused = "response";
  }

  return {
    requestEditor,
    responseEditor,
    request: requestEditor?.state.doc.toString(),
    response: responseEditor?.state.doc.toString(),
    requestSelectedText: getSelectedText(requestEditor),
    responseSelectedText: getSelectedText(responseEditor),
    focused,
  };
};

export const getCurrentReplayEditors = () => {
  if (window.location.hash.split("?")[0] !== "#/replay") {
    return {
      requestEditor: undefined,
      responseEditor: undefined,
      request: undefined,
      response: undefined,
      requestSelectedText: undefined,
      responseSelectedText: undefined,
      focused: undefined,
      currentlySelectedReplayTab: "",
      currentlySelectedReplayTabSessionId: "",
    };
  }

  const requestEditor = (
    document.querySelector(".cm-content[data-language='http-request']") as any
  )?.cmView?.view;
  const responseEditor = (
    document.querySelector(".cm-content[data-language='http-response']") as any
  )?.cmView?.view;
  const focusedEditor = (
    document.querySelector(".cm-editor.cm-focused .cm-content") as any
  )?.cmView?.view;
  let focused = undefined;
  if (focusedEditor === requestEditor) {
    focused = "request";
  } else if (focusedEditor === responseEditor) {
    focused = "response";
  }

  return {
    requestEditor,
    responseEditor,
    request: requestEditor?.state.doc.toString(),
    response: responseEditor?.state.doc.toString(),
    requestSelectedText: getSelectedText(requestEditor),
    responseSelectedText: getSelectedText(responseEditor),
    focused,
    currentlySelectedReplayTab: getCurrentlySelectedReplayTab(),
    currentlySelectedReplayTabSessionId:
      getCurrentlySelectedReplayTabSessionId(),
  };
};

export const getCurrentAutomateEditors = () => {
  if (window.location.hash.split("?")[0] !== "#/automate") {
    return {
      requestPreEditor: undefined,
      requestEditor: undefined,
      responseEditor: undefined,
      requestPre: undefined,
      request: undefined,
      response: undefined,
      requestPreSelectedText: undefined,
      requestSelectedText: undefined,
      responseSelectedText: undefined,
      focused: undefined,
      currentlySelectedAutomateTab: "",
      currentlySelectedAutomateTabSessionId: "",
    };
  }
  const requestPreEditor = (
    document.querySelector(".c-request-editor .cm-content") as any
  )?.cmView?.view;
  const requestEditor = (
    document.querySelector(".c-request-skeleton__body .cm-content") as any
  )?.cmView?.view;
  const responseEditor = (
    document.querySelector(".c-response-skeleton__body .cm-content") as any
  )?.cmView?.view;
  return {
    requestPreEditor,
    requestEditor,
    responseEditor,
    requestPre: requestPreEditor?.state.doc.toString(),
    request: requestEditor?.state.doc.toString(),
    response: responseEditor?.state.doc.toString(),
    requestPreSelectedText: getSelectedText(requestPreEditor),
    requestSelectedText: getSelectedText(requestEditor),
    responseSelectedText: getSelectedText(responseEditor),
    currentlySelectedAutomateTab: getCurrentlySelectedAutomateTab(),
    currentlySelectedAutomateTabSessionId:
      getCurrentlySelectedAutomateTabSessionId(),
  };
};

export const getCurrentHttpHistoryEditors = () => {
  if (window.location.hash.split("?")[0] !== "#/http-history") {
    return {
      requestEditor: undefined,
      responseEditor: undefined,
      request: undefined,
      response: undefined,
      requestSelectedText: undefined,
      responseSelectedText: undefined,
      focused: undefined,
    };
  }

  const requestEditor = (
    document.querySelector(".c-request .cm-content") as any
  )?.cmView?.view;
  const responseEditor = (
    document.querySelector(".c-response .cm-content") as any
  )?.cmView?.view;
  const focusedEditor = (
    document.querySelector(".cm-editor.cm-focused .cm-content") as any
  )?.cmView?.view;
  logger.log("Focused editor:", focusedEditor);
  let focused = undefined;
  if (focusedEditor === requestEditor) {
    focused = "request";
  } else if (focusedEditor === responseEditor) {
    focused = "response";
  }

  return {
    requestEditor,
    responseEditor,
    request: requestEditor?.state.doc.toString(),
    response: responseEditor?.state.doc.toString(),
    requestSelectedText: getSelectedText(requestEditor),
    responseSelectedText: getSelectedText(responseEditor),
    focused,
    focusedEditorSelectedText: getSelectedText(focusedEditor),
  };
};

export const getCurrentRow = () => {
  const selectedRow = document.querySelector(
    '.c-table__item-row[data-is-selected="true"]',
  );
  const row = selectedRow
    ? Array.from(selectedRow.querySelectorAll(".c-item-cell__inner")).map(
        (cell) => cell.textContent || "",
      )
    : [];
  const header = Array.from(
    document
      .querySelector(".c-table__header-row")
      ?.querySelectorAll(".c-header-cell__content") || [],
  ).map((r) => r.textContent || "");

  const rowData = header.reduce(
    (acc: { [key: string]: string }, key, index) => {
      acc[key] = row[index] || "";
      return acc;
    },
    {},
  );

  return rowData;
};

export const getHttpqlBar = (caido: Caido) => {
  return caido.httpHistory.getQuery();
};

export const getCurrentScope = () => {
  const scope = document.querySelector(
    ".c-scope-dropdown .p-select-label span",
  )?.textContent;
  return scope || "";
};

export const getCurrentSidebarTab = () => {
  const activeTab = document.querySelector(
    'li[data-pc-section="item"].bg-surface-900',
  );
  return activeTab ? activeTab.textContent : "";
};
export const navigateToSidebarTab = async (tabName: string) => {
  const tab = Array.from(
    document.querySelectorAll("li[data-pc-section='item'] > div >a"),
  ).filter((a) => a.textContent == tabName);
  if (tab.length == 0) {
    logger.error(`Tab with name "${tabName}" not found`);
    return;
  }
  if (tab[0] instanceof HTMLElement) {
    tab[0].click();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};
export const getCurrentlySelectedReplayTab = () => {
  const activeTab = document.querySelector(
    '[data-is-selected="true"][data-session-id]',
  );
  return activeTab ? activeTab.textContent : "";
};
export const getCurrentlySelectedReplayTabSessionId = () => {
  const activeTab = document.querySelector(
    '[data-is-selected="true"][data-session-id]',
  );
  return activeTab ? activeTab.getAttribute("data-session-id") : "";
};
export const getCurrentlySelectedAutomateTab = () => {
  const activeTab = document.querySelector(
    '.c-tree-session[data-is-selected="true"] .c-tree-session__name,.c-tree-session:has([data-is-active="true"]) .c-tree-session__name',
  );
  return activeTab ? activeTab.textContent : "";
};
export const getCurrentlySelectedAutomateTabSessionId = () => {
  const activeTab = document.querySelector(
    '.c-tree-session[data-is-selected="true"],.c-tree-session:has([data-is-active="true"])',
  );
  return activeTab ? activeTab.getAttribute("data-session-id") : "";
};
export const sendCurrentReplayTab = () => {
  const sendButton = document.querySelector(".c-send-request-button button");
  if (sendButton instanceof HTMLElement) {
    sendButton.click();
  } else {
    logger.error("Send request button not found");
  }
};
export const switchToReplayTab = (sessionId: string) => {
  const targetTab = document.querySelector(
    `[data-session-id="${sessionId}"] .c-tree-item__item`,
  );
  if (targetTab instanceof HTMLElement) {
    targetTab.dispatchEvent(new MouseEvent("mousedown"));
  } else {
    logger.error(`Tab with session ID "${sessionId}" not found`);
  }
};
export const switchToReplayTabByName = (name: string) => {
  const allTabs = document.querySelectorAll(".c-tree-session");
  for (const tab of allTabs) {
    const labelElement = tab.querySelector(".c-label__label");
    if (labelElement && labelElement.textContent === name) {
      const clickableItem = tab.querySelector(".c-tree-item__item");
      if (clickableItem instanceof HTMLElement) {
        clickableItem.dispatchEvent(new MouseEvent("mousedown"));
        return;
      }
    }
  }
  logger.error(`Tab with name "${name}" not found`);
};

export const getCurrentProjectName = () => {
  const projectNameElement = document.querySelector(
    ".c-current-project[data-project-id]",
  );
  return projectNameElement instanceof HTMLElement
    ? projectNameElement.innerText
    : "";
};
export const getCurrentProjectID = () => {
  const projectElement = document.querySelector(".c-current-project");
  return projectElement instanceof HTMLElement
    ? projectElement.getAttribute("data-project-id") || ""
    : "";
};

export const getHostedFiles = (caido: Caido) => {
  try {
    const result = caido.files.getAll();
    const firstFilePath = result[0]?.path;
    const basePath = firstFilePath
      ? firstFilePath.includes("\\")
        ? firstFilePath.split("\\").slice(0, -1).join("\\") + "\\"
        : firstFilePath.split("/").slice(0, -1).join("/") + "/"
      : "";

    return {
      basePath: basePath,
      files: result.map((file: any) => ({
        name: file.name,
        id: file.id,
        size: file.size,
      })),
    };
  } catch (error) {
    logger.error("Error fetching hosted files:", error);
    return { basePath: "", files: [] };
  }
};
export const switchToAutomateTab = async (sessionId: string) => {
  navigateToSidebarTab("Automate");
  await new Promise((resolve) => setTimeout(resolve, 200));
  const targetTab = document.querySelector(
    `[data-session-id="${sessionId}"] .c-tree-item__item`,
  );
  if (targetTab instanceof HTMLElement) {
    targetTab.dispatchEvent(new MouseEvent("mousedown"));
  } else {
    logger.error(`AutomateTab with session ID "${sessionId}" not found`);
  }
};

// Storage management functions
export const getPluginStorage = async (
  caido: Caido,
): Promise<PluginStorage> => {
  try {
    const storage = await caido.storage.get();
    if (!storage) {
      return DEFAULT_PLUGIN_STORAGE;
    }

    // Remove old fields - clean this up in future versions
    if (storage.agents) {
      delete storage.agents;
    }
    if (storage.agentTabAssociations) {
      delete storage.agentTabAssociations;
    }
    
    // Migrate storage if needed
    const migratedStorage = migrateStorage(storage as unknown as PluginStorage);
    
    return migratedStorage;
  } catch (error) {
    logger.error("Error getting plugin storage:", error);
    throw error;
  }
};

/**
 * Migrates storage from old format to new format
 * Handles the migration of memory and aiInstructions from string to project-based map
 */
export const migrateStorage = (storage: PluginStorage): PluginStorage => {
  if (!storage.settings) {
    return storage;
  }
  
  const projectName = getCurrentProjectName() || 'default';
  
  // Migrate memory field
  if (typeof storage.settings.memory === 'string') {
    const memoryContent = storage.settings.memory;
    storage.settings.memory = {
      [projectName]: memoryContent
    };
  }
  
  // Migrate aiInstructions field
  if (typeof storage.settings.aiInstructions === 'string') {
    const aiInstructionsContent = storage.settings.aiInstructions;
    storage.settings.aiInstructions = {
      [projectName]: aiInstructionsContent
    };
  }
  
  return storage;
};

export const setPluginStorage = async (
  caido: Caido,
  storage: Partial<PluginStorage>,
): Promise<void> => {
  try {
    logger.log("Setting plugin storage:", storage);
    const currentStorage = await getPluginStorage(caido);
    const newStorage = {
      ...currentStorage,
      ...storage,
    };
    await caido.storage.set(newStorage);
  } catch (error) {
    logger.error("Error setting plugin storage:", error);
    throw error;
  }
};




//Agent Utils
export const getReqAndRespBySessionId = async (caido: Caido, { sessionId }: { sessionId: string }) => {
  const auth = JSON.parse(localStorage.getItem("CAIDO_AUTHENTICATION") || "{}");
  const accessToken = auth.accessToken;
  
  const response = await fetch("/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json", 
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
      query:
        "query replaySessionEntries($id: ID!){\n    replaySession(id: $id){\n        activeEntry{\n            session{\n                id\n            }\n            request{\n                raw\n                response{\n                    raw\n                }\n            }\n        }\n    }\n}",
      variables: { id: sessionId },
      operationName: "replaySessionEntries",
    }),
  });

  const jsonResponse = await response.json();

  // Extract the relevant data from the response
  const sessionData = jsonResponse.data?.replaySession?.activeEntry;

  // Format the response as requested
  return {
    sessionId: sessionId,
    request: sessionData?.request?.raw ? atob(sessionData.request.raw) : "",
    response: sessionData?.request?.response?.raw ? atob(sessionData.request.response.raw) : ""
  };
}

export const sendReplayBySessionId = async (caido: Caido, sessionId: string, rawBody: string): Promise<void> => {
  const auth = JSON.parse(localStorage.getItem("CAIDO_AUTHENTICATION") || "{}");
  const accessToken = auth.accessToken;
  
  const response = await fetch("/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json", 
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
      query:
        "query replaySessionEntries($id: ID!){\n    replaySession(id: $id){\n        activeEntry{\n            session{\n                id\n            }\n            request{\n      isTls port host      }\n        }\n    }\n}",
      variables: { id: sessionId },
      operationName: "replaySessionEntries",
    }),
  });

  const jsonResponse = await response.json();
  const sessionData = jsonResponse.data?.replaySession?.activeEntry;
  const startReplayTaskResponse = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", 
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: "mutation startReplayTask($sessionId: ID!, $input: StartReplayTaskInput!) {\n  startReplayTask(sessionId: $sessionId, input: $input) {\n    task {\n   id createdAt } } }",
      variables: {
        input: {
          connection: {
            host: sessionData.request.host,
            isTLS: sessionData.request.isTls,
            port: sessionData.request.port
          },
          raw: btoa(rawBody),
          settings: {
            placeholders: [],
            updateContentLength: true
          }
        },
        sessionId: sessionId
      },
      operationName: "startReplayTask",
    }),
  });

  if (!startReplayTaskResponse.ok) {
    throw new Error(`Failed to start replay task: ${startReplayTaskResponse.statusText}`);
  }

  const replayTaskData = await startReplayTaskResponse.json();
  if (replayTaskData.errors) {
    throw new Error(`GraphQL error starting replay task: ${replayTaskData.errors[0].message}`);
  }
};
