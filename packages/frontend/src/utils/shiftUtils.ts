import {
  getCurrentSidebarTab,
  getCurrentReplayEditors,
  getCurrentHttpHistoryEditors,
  getCurrentAutomateEditors,
  getCurrentScope,
  getCurrentProjectName,
  getCurrentProjectID,
  getHostedFiles,
  getCurrentInterceptEditors,
  getCurrentSearchEditors,
  getCurrentRow,
} from "./caidoUtils";
import { actionFunctions } from "../commands";
import type { Caido } from "@caido/sdk-frontend";
import {
  API_ENDPOINT,
  CONTEXT_ENDPOINT,
  ActiveEntity,
  MAX_SIZE,
} from "../constants";
import { getPluginStorage, setPluginStorage } from "./caidoUtils";
import logger from "./logger";

// Context functions
export const getShiftContext = async (
  caido: Caido,
  lastFocusedEditor: HTMLElement | null,
) => {
  logger.log("Getting shift context");
  let context;
  let activeEntity: ActiveEntity | undefined;
  const activeTab = getCurrentSidebarTab();
  //Generic Context
  const projectName = getCurrentProjectName();
  const projectId = getCurrentProjectID();
  const scopeName = getCurrentScope();
  const scopes = await caido.scopes.getScopes();
  logger.log("Scopes:", scopes);
  logger.log("Scope name:", scopeName);
  const scopeConfig = scopes.filter((s) => s.name == scopeName);
  const scope = scopeConfig.length > 0 ? scopeConfig[0] : {};
  logger.log("Scope:", scope);
  const hostedFiles = await getHostedFiles(caido);
  const filters = caido.filters.getAll();
  let convertWorkflows = await caido.graphql.workflowsState();// change to caido.workflows.getAll() when SDK updates
  convertWorkflows = convertWorkflows.workflows
    .filter((a: any) => a.kind === "CONVERT")
    .map((a: any) => {
      return { id: a.id, name: a.name, description: a.definition.description };
    });

  context = {
    projectName,
    projectId,
    hostedFiles,
    scope,
    scopes,
    filters,
    convertWorkflows,
  };
  //Specific Context
  logger.log("Active tab:", activeTab);
  if (activeTab === "Replay") {
    const {
      request,
      response,
      requestSelectedText,
      responseSelectedText,
      currentlySelectedReplayTab,
      currentlySelectedReplayTabSessionId,
    } = getCurrentReplayEditors();
    const { focused, activeEntity: determinedActiveEntity } =
      determineActiveEntity(lastFocusedEditor, request, response, activeTab);
    activeEntity = determinedActiveEntity;
    logger.log("Active entity:", activeEntity);
    context = {
      request,
      response,
      requestSelectedText,
      responseSelectedText,
      ...context,
      currentlySelectedReplayTab,
      currentlySelectedReplayTabSessionId,
    };
  } else if (activeTab === "HTTP History") {
    const { request, response, requestSelectedText, responseSelectedText } =
      getCurrentHttpHistoryEditors();
    logger.log("Request:", request);
    logger.log("Response:", response);
    logger.log(
      "Last focused editor:",
      lastFocusedEditor?.state?.doc?.toString(),
    );
    const { focused, activeEntity: determinedActiveEntity } =
      determineActiveEntity(lastFocusedEditor, request, response, activeTab);
    activeEntity = determinedActiveEntity;
    logger.log("Active entity:", activeEntity);
    const currentRow = getCurrentRow();
    const httpqlBar = caido.httpHistory.getQuery();

    context = {
      request,
      response,
      requestSelectedText,
      responseSelectedText,
      ...context,
      currentRow,
      httpqlBar,
    };
  } else if (activeTab === "Search") {
    const { request, response, requestSelectedText, responseSelectedText } =
      getCurrentSearchEditors();
    const { focused, activeEntity: determinedActiveEntity } =
      determineActiveEntity(lastFocusedEditor, request, response, activeTab);
    activeEntity = determinedActiveEntity;
    const currentRow = getCurrentRow();
    const searchBar = caido.search.getQuery();
    context = {
      searchBar,
      currentRow,
      request,
      response,
      requestSelectedText,
      responseSelectedText,
      ...context,
    };
  } else if (activeTab === "Intercept") {
    const { request, response, requestSelectedText, responseSelectedText } =
      getCurrentInterceptEditors();
    logger.log("Intercept", "lfe", lastFocusedEditor);
    logger.log("Intercept", "request", request);
    logger.log("Intercept", "response", response);
    const { focused, activeEntity: determinedActiveEntity } =
      determineActiveEntity(lastFocusedEditor, request, response, activeTab);
    activeEntity = determinedActiveEntity;
    logger.log("Active entity intercept:", activeEntity);
    context = {
      request,
      response,
      requestSelectedText,
      responseSelectedText,
      ...context,
    };
  } else if (activeTab === "Shift") {
    activeEntity = ActiveEntity.Shift;
  } else if (activeTab === "Automate") {
    const {
      requestPre,
      requestPreSelectedText,
      request,
      requestSelectedText,
      response,
      responseSelectedText,
      currentlySelectedAutomateTab,
      currentlySelectedAutomateTabSessionId,
    } = getCurrentAutomateEditors();
    if (requestPre) {
      activeEntity = ActiveEntity.AutomateRequestPreLaunch;
    } else {
      const { focused, activeEntity: determinedActiveEntity } =
        determineActiveEntity(lastFocusedEditor, request, response, activeTab);
      activeEntity = determinedActiveEntity;
    }
    context = {
      requestPre,
      requestPreSelectedText,
      request,
      response,
      requestSelectedText,
      responseSelectedText,
      ...context,
      currentlySelectedAutomateTab,
      currentlySelectedAutomateTabSessionId,
    };
  }
  // Track which fields were truncated
  const truncated = [];
  if (context?.request && context?.request?.length > MAX_SIZE) {
    context.request = context.request.substring(0, MAX_SIZE);
    truncated.push("request");
  }
  if (context?.response && context?.response?.length > MAX_SIZE) {
    context.response = context.response.substring(0, MAX_SIZE);
    truncated.push("response");
  }
  context.truncated = truncated;

  sendShiftContext(context, activeEntity as ActiveEntity);
  return { context, activeEntity };
};

const determineActiveEntity = (
  lastFocusedEditor: HTMLElement | null,
  request: any,
  response: any,
  activeTab: string,
) => {
  let lfe = lastFocusedEditor?.state?.doc?.toString();
  const focused =
    lfe === request ? "request" : lfe === response ? "response" : undefined;
  logger.log("Focused:", focused);
  let activeEntity: ActiveEntity | undefined;
  if (activeTab === "Replay") {
    if (focused === "request") {
      activeEntity = ActiveEntity.ReplayRequest;
    } else if (focused === "response") {
      activeEntity = ActiveEntity.ReplayResponse;
    }
  } else if (activeTab === "HTTP History") {
    if (focused === "request") {
      activeEntity = ActiveEntity.HttpHistoryRequest;
    } else if (focused === "response") {
      activeEntity = ActiveEntity.HttpHistoryResponse;
    } else {
      activeEntity = ActiveEntity.HttpHistoryRow;
    }
  } else if (activeTab === "Intercept") {
    if (focused === "request") {
      activeEntity = ActiveEntity.InterceptRequest;
    } else if (focused === "response") {
      activeEntity = ActiveEntity.InterceptResponse;
    }
  } else if (activeTab === "Search") {
    if (focused === "request") {
      activeEntity = ActiveEntity.SearchRequest;
    } else if (focused === "response") {
      activeEntity = ActiveEntity.SearchResponse;
    } else if (focused === undefined) {
      activeEntity = ActiveEntity.SearchRow;
    }
  } else if (activeTab === "Automate") {
    if (focused === "request") {
      activeEntity = ActiveEntity.AutomateRequest;
    } else if (focused === "response") {
      activeEntity = ActiveEntity.AutomateResponse;
    }
  } else {
    activeEntity = ActiveEntity.Unknown;
  }
  return { focused, activeEntity };
};

export const sendShiftContext = (context: any, activeEntity: ActiveEntity) => {
  // fetch(API_ENDPOINT+CONTEXT_ENDPOINT, {
  //     method: 'POST',
  //     headers: {
  //         'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({ context, activeEntity })
  // });
};

// Response functions
export const handleServerResponse = async (caido: Caido, actions: any[]) => {
  let ksv = {};
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    // Add delay between actions
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (action.name === "showConfirmationModal") {
      const confirmed = await actionFunctions[action.name](
        caido,
        action.parameters,
      );
      if (!confirmed) {
        logger.log("Action aborted by user");
        return;
      }
    } else {
      const actionFunction = actionFunctions[action.name];
      if (actionFunction) {
        if (action.load) {
          logger.log("Loading keys:", action.load);
          logger.log("Key store:", ksv);
          for (const key of Object.keys(action.load)) {
            if (ksv[action.load[key]]) {
              logger.log(
                "Loading key:",
                key,
                "with value:",
                ksv[action.load[key]],
              );
              action.parameters[key] = ksv[action.load[key]];
            }
          }
        }
        let output = await actionFunction(caido, action.parameters);
        logger.log("Action output:", output);
        if (action.store) {
          for (const key of Object.keys(action.store)) {
            logger.log(
              "Storing key:",
              key,
              "with value:",
              output[action.store[key]],
            );
            ksv[key] = output[action.store[key]];
          }
        }
      } else {
        logger.error(`Unknown action: ${action.name}`);
      }
    }
  }
};

export const fetchShiftResponse = async (
  apiKey: string,
  query: string,
  activeEntity: ActiveEntity,
  context: any,
  memory: string,
  aiInstructions: string
) => {
  try {
    const serverResponse = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        activeEntity: activeEntity,
        context: context,
        memory: memory,
        aiInstructions: aiInstructions
      }),
    });
    if (serverResponse.ok) {
      const data = await serverResponse.json();
      return data;
    } else {
      const errorData = await serverResponse.json();
      if (errorData?.detail === "Invalid or expired API key") {
        throw new Error("Invalid API key");
      }
      throw new Error("Unable to process query");
    }
  } catch (error) {
    logger.error("Error querying Shift:", error);
    
    // List of errors that should be passed through
    const knownErrors = ["Invalid API key", "Unable to process query"];
    if (error instanceof Error && knownErrors.includes(error.message)) {
      throw error; // Re-throw known errors
    }
    
    throw new Error("Servers down for maintenance. Try again.");
  }
};

export const checkAndRenameReplayTabs = async (
  caido: Caido,
  apiKey: string,
  projectName: string,
  renameDelay: number,
  renameInstructions: string,
) => {
  try {
    // Get all current sessions
    logger.log("Checking and renaming replay tabs");
    const sessions = await caido.replay.getSessions();

    // Get already assessed tabs from storage
    const storage = await getPluginStorage(caido);
    if (!storage.settings.alreadyAssessedTabs) {
      storage.settings.alreadyAssessedTabs = {};
    }
    if (!storage.settings.alreadyAssessedTabs[projectName]) {
      storage.settings.alreadyAssessedTabs[projectName] = [];
    }

    // Filter sessions that haven't been assessed
    const unassessedSessions = sessions.filter(
      (session) =>
        !storage.settings.alreadyAssessedTabs?.[projectName]?.includes(
          session.id,
        ),
    );
    logger.log("Unassessed sessions:", unassessedSessions);

    if (unassessedSessions.length === 0) return;

    // Get authentication token
    const auth = JSON.parse(
      localStorage.getItem("CAIDO_AUTHENTICATION") || "{}",
    );
    const accessToken = auth.accessToken;

    for (const session of unassessedSessions) {
      logger.log("Checking session:", session.id);
      // Get detailed session info
      const response = await fetch("/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query:
            "query replaySession($id:String!){replaySession(id:$id){activeEntry{createdAt raw session{id name}}}}",
          variables: { id: session.id },
          operationName: "replaySession",
        }),
      });

      const data = await response.json();
      const entry = data.data.replaySession.activeEntry;
      if (!entry) {
        logger.log("No entry found for session:", session.id);
        continue;
      }

      // Check if enough time has passed
      const now = new Date().getTime();
      const timeDiff = (now - entry.createdAt) / 1000; // Convert to seconds

      logger.log(
        "Time diff:",
        timeDiff,
        "is greater than rename delay:",
        renameDelay,
      );
      if (timeDiff >= renameDelay) {
        if (entry.session.name === session.id) {
          logger.log(
            "Entry name:",
            entry.session.name,
            "is equal to session id:",
            session.id,
          );
          // Request new name from API
          const renameResponse = await fetch(API_ENDPOINT + "/rename", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              raw: entry.raw,
              sessionId: session.id,
              instructions: renameInstructions,
            }),
          });

          if (renameResponse.ok) {
            const { name } = await renameResponse.json();

            // Rename the session
            await caido.replay.renameSession(session.id, name);

            // Add to assessed tabs
          }
        }
        storage.settings.alreadyAssessedTabs[projectName].push(session.id);
      }
    }

    // Save all changes to storage at the end
    logger.log("Saving storage:", storage);
    await setPluginStorage(caido, storage);
  } catch (error) {
    logger.error("Error in checkAndRenameReplayTabs:", error);
  }
};
