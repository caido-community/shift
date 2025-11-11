import { watch, type WatchStopHandle } from "vue";

import { onLocationChange } from "@/dom";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { type FrontendSDK } from "@/types";

const REPLAY_HASH = "#/replay";
const BASE_INDICATOR_CLASS = "shift-ai-indicator";
const COLLECTION_INDICATOR_CLASS = "shift-ai-indicator--collection";
const SESSION_INDICATOR_CLASS = "shift-ai-indicator--session";
const COLLECTION_TOOLTIP = "This collection is controlled by Shift AI";
const SESSION_TOOLTIP = "This session is controlled by Shift AI";
const REINJECT_DELAY_MS = 100;

// The goal of this whole file is to create indicators in the replay tree that show the status of the agents.

type AgentStatusSnapshot = {
  sessionId: string;
  numMessages: number;
  status: string;
  error?: Error;
};

const createIndicator = (
  container: Element,
  variantClass: string,
  tooltip: string,
  sessionState?: AgentStatusSnapshot,
) => {
  const existing = container.querySelector<HTMLElement>(`.${variantClass}`);
  if (existing) {
    existing.classList.remove("text-success-500", "text-error-500");
    if (sessionState && sessionState.status === "streaming") {
      existing.classList.add("text-success-500");
    } else if (sessionState && sessionState.status === "error") {
      existing.classList.add("text-error-500");
    }
    existing.title = tooltip;
    existing.setAttribute("aria-label", tooltip);
    existing.dataset.shiftAiIndicatorTooltip = tooltip;
    return existing;
  }

  const indicator = document.createElement("i");
  indicator.classList.add(
    BASE_INDICATOR_CLASS,
    variantClass,
    "fa-solid",
    "fa-brain",
    "inline",
  );
  indicator.title = tooltip;
  indicator.setAttribute("aria-label", tooltip);
  indicator.setAttribute("role", "img");

  indicator.dataset.shiftAiIndicatorTooltip = tooltip;

  if (variantClass === COLLECTION_INDICATOR_CLASS) {
    const insertBeforeTarget = container.children.item(1);
    container.insertBefore(indicator, insertBeforeTarget);
  } else if (variantClass === SESSION_INDICATOR_CLASS) {
    container.insertBefore(indicator, container.children.item(0));
  }

  return indicator;
};

const removeIndicator = (container: Element, variantClass: string) => {
  const indicator = container.querySelector(`.${variantClass}`);
  if (indicator) {
    indicator.remove();
  }
};

const cleanupIndicators = () => {
  document
    .querySelectorAll<HTMLElement>(`.${BASE_INDICATOR_CLASS}`)
    .forEach((node) => node.remove());

  document
    .querySelectorAll<HTMLElement>("[data-shift-ai-collection]")
    .forEach((node) => {
      node.removeAttribute("data-shift-ai-collection");
    });

  document
    .querySelectorAll<HTMLElement>("[data-shift-ai-agent]")
    .forEach((node) => {
      node.removeAttribute("data-shift-ai-agent");
      node.removeAttribute("data-shift-ai-agent-status");
    });
};

const computeAutoLaunchCollectionIds = (
  sdk: FrontendSDK,
  configStore: ReturnType<typeof useConfigStore>,
) => {
  const targetNames = new Set<string>();
  targetNames.add("Shift");

  for (const prompt of configStore.customPrompts) {
    const collectionName = configStore.getProjectAutoExecuteCollection(
      prompt.id,
    );
    if (collectionName) {
      targetNames.add(collectionName);
    }
  }

  const ids = new Set<string>();
  try {
    const collections = sdk.replay.getCollections();
    for (const collection of collections ?? []) {
      const collectionId =
        typeof collection?.id === "string" && collection.id.length > 0
          ? collection.id
          : undefined;
      const collectionName =
        typeof collection?.name === "string" && collection.name.length > 0
          ? collection.name
          : undefined;
      if (collectionId === undefined || collectionName === undefined) {
        continue;
      }
      if (targetNames.has(collectionName)) {
        ids.add(collectionId);
      }
    }
  } catch (error) {
    console.warn(
      "[Shift Agents] Failed to resolve collections for AI indicators",
      error,
    );
  }

  return ids;
};

const isOnReplayHash = () => window.location.hash === REPLAY_HASH;

const findReplayTreeRoot = (): Element | undefined => {
  const collectionNode = document.querySelector(".c-tree-collection");
  return collectionNode?.parentElement ?? undefined;
};

export const useAgentIndicatorManager = (sdk: FrontendSDK) => {
  const agentsStore = useAgentsStore();
  const configStore = useConfigStore();

  let unsubscribeLocation: (() => void) | undefined;
  let unsubscribeAgents: (() => void) | undefined;
  let configWatchStopHandle: WatchStopHandle | undefined;
  let observer: MutationObserver | undefined;
  let pendingUpdateHandle: number | undefined;
  let reinjectTimeout: number | undefined;
  let latestAgentStates: AgentStatusSnapshot[] = [];

  const agentStateMap = () => {
    return new Map(
      latestAgentStates.map((snapshot) => [snapshot.sessionId, snapshot]),
    );
  };

  const cancelPendingUpdate = () => {
    if (pendingUpdateHandle !== undefined) {
      cancelAnimationFrame(pendingUpdateHandle);
      pendingUpdateHandle = undefined;
    }
  };

  const cancelReinject = () => {
    if (reinjectTimeout !== undefined) {
      window.clearTimeout(reinjectTimeout);
      reinjectTimeout = undefined;
    }
  };

  const refreshCollectionIndicators = () => {
    if (!isOnReplayHash()) {
      return;
    }

    const autoLaunchIds = computeAutoLaunchCollectionIds(sdk, configStore);
    const collectionNameNodes = document.querySelectorAll(
      ".c-tree-collection__name",
    );

    collectionNameNodes.forEach((nameNode) => {
      const parentCollection =
        nameNode.closest<HTMLElement>(".c-tree-collection");
      if (!parentCollection) {
        return;
      }

      const collectionId = parentCollection.getAttribute("data-collection-id");
      if (collectionId === null || collectionId.length === 0) {
        return;
      }

      if (autoLaunchIds.has(collectionId)) {
        createIndicator(
          nameNode,
          COLLECTION_INDICATOR_CLASS,
          COLLECTION_TOOLTIP,
        );
        parentCollection.dataset.shiftAiCollection = "true";
      } else {
        removeIndicator(nameNode, COLLECTION_INDICATOR_CLASS);
        if (parentCollection.dataset.shiftAiCollection !== undefined) {
          delete parentCollection.dataset.shiftAiCollection;
        }
      }
    });
  };

  const findSessionIndicatorTargets = (parentSession: HTMLElement) => {
    const targets = new Set<HTMLElement>();

    const nameNode = parentSession.querySelector<HTMLElement>(
      ".c-tree-session__name",
    );
    if (nameNode) {
      targets.add(nameNode);
    }

    const buttonSpan = parentSession.querySelector<HTMLElement>(
      "button > div:has(span)",
    );
    if (buttonSpan) {
      targets.add(buttonSpan);
    }

    return [...targets];
  };

  const refreshSessionIndicators = () => {
    if (!isOnReplayHash()) {
      return;
    }

    const stateBySessionId = agentStateMap();
    const sessionNodes =
      document.querySelectorAll<HTMLElement>("[data-session-id]");

    sessionNodes.forEach((parentSession) => {
      const sessionId = parentSession.getAttribute("data-session-id");
      if (sessionId === null || sessionId.length === 0) {
        return;
      }

      const sessionState = stateBySessionId.get(sessionId);
      const targetNodes = findSessionIndicatorTargets(parentSession);

      if (sessionState && sessionState.numMessages > 0) {
        targetNodes.forEach((targetNode) => {
          const indicator = createIndicator(
            targetNode,
            SESSION_INDICATOR_CLASS,
            SESSION_TOOLTIP,
            sessionState,
          );
          indicator.dataset.shiftAiAgentStatus = sessionState.status;
        });
        parentSession.dataset.shiftAiAgent = "true";
        parentSession.dataset.shiftAiAgentStatus = sessionState.status;
      } else {
        targetNodes.forEach((targetNode) => {
          removeIndicator(targetNode, SESSION_INDICATOR_CLASS);
        });
        if (parentSession.dataset.shiftAiAgent !== undefined) {
          delete parentSession.dataset.shiftAiAgent;
        }
        if (parentSession.dataset.shiftAiAgentStatus !== undefined) {
          delete parentSession.dataset.shiftAiAgentStatus;
        }
        parentSession
          .querySelectorAll<HTMLElement>(`.${SESSION_INDICATOR_CLASS}`)
          .forEach((indicator) => indicator.remove());
      }
    });
  };

  const updateIndicators = () => {
    refreshCollectionIndicators();
    refreshSessionIndicators();
  };

  const scheduleUpdate = (immediate = false) => {
    cancelPendingUpdate();
    if (immediate) {
      updateIndicators();
      return;
    }
    pendingUpdateHandle = requestAnimationFrame(() => {
      pendingUpdateHandle = undefined;
      updateIndicators();
    });
  };

  const observeReplayTree = () => {
    const root = findReplayTreeRoot();
    if (!root) {
      cancelPendingUpdate();
      cancelReinject();
      reinjectTimeout = window.setTimeout(() => {
        reinjectTimeout = undefined;
        observeReplayTree();
      }, REINJECT_DELAY_MS);
      return;
    }

    observer?.disconnect();
    observer = new MutationObserver(() => {
      scheduleUpdate();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    scheduleUpdate(true);
  };

  const ensureAgentSubscription = () => {
    if (unsubscribeAgents) {
      return;
    }

    unsubscribeAgents = agentsStore.subscribeToAgentStates((snapshot) => {
      latestAgentStates = snapshot.map((state) => ({ ...state }));
      refreshSessionIndicators();
    });
  };

  const ensureConfigWatcher = () => {
    if (configWatchStopHandle) {
      return;
    }

    configWatchStopHandle = watch(
      () =>
        configStore.customPrompts.map((prompt) => ({
          id: prompt.id,
          autoCollection: configStore.getProjectAutoExecuteCollection(
            prompt.id,
          ),
        })),
      () => {
        refreshCollectionIndicators();
      },
      { deep: true },
    );
  };

  const remove = () => {
    cancelPendingUpdate();
    cancelReinject();
    observer?.disconnect();
    observer = undefined;
    cleanupIndicators();
  };

  const start = () => {
    ensureAgentSubscription();
    ensureConfigWatcher();

    if (isOnReplayHash()) {
      observeReplayTree();
    }

    unsubscribeLocation = onLocationChange(({ newHash }) => {
      if (newHash === REPLAY_HASH) {
        observeReplayTree();
      } else {
        remove();
      }
    });
  };

  const stop = () => {
    if (unsubscribeLocation) {
      unsubscribeLocation();
      unsubscribeLocation = undefined;
    }
    if (unsubscribeAgents) {
      unsubscribeAgents();
      unsubscribeAgents = undefined;
    }
    if (configWatchStopHandle) {
      configWatchStopHandle();
      configWatchStopHandle = undefined;
    }
    remove();
  };

  return {
    start,
    stop,
    refresh: updateIndicators,
  };
};
