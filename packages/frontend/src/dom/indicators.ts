import { type Indicator, type ListenerHandle } from "@caido/sdk-frontend";
import { type ChatStatus } from "ai";
import { watch, type WatchStopHandle } from "vue";

import { watchReplayPage } from "@/dom/utils";
import { useAgentStore } from "@/stores/agent";
import { type FrontendSDK } from "@/types";

type SessionIndicatorEntry = {
  indicator: Indicator;
  icon: string;
  description: string;
};

const BASE_INDICATOR_CLASS = "internal-shift-indicator";
const SHIFT_COLLECTION_TOOLTIP = "Managed by Shift AI";
const SHIFT_COLLECTION_INDICATOR_ID = `${BASE_INDICATOR_CLASS}-shift-collection`;

const getIconFromChatStatus = (status: ChatStatus): string => {
  if (status === "error") {
    return "fas fa-wand-magic-sparkles c-text-error-500";
  }
  if (status === "streaming" || status === "submitted") {
    return "fas fa-wand-magic-sparkles c-text-success-500";
  }
  return "fas fa-wand-magic-sparkles";
};

const getDescriptionFromChatStatus = (status: ChatStatus): string => {
  switch (status) {
    case "error":
      return "Shift AI encountered an error";
    case "streaming":
    case "submitted":
      return "Shift AI is processing...";
    default:
      return "This session is controlled by Shift AI";
  }
};

const createShiftCollectionIndicator = (container: Element): HTMLElement => {
  const existing = container.querySelector<HTMLElement>(`#${SHIFT_COLLECTION_INDICATOR_ID}`);
  if (existing) {
    return existing;
  }

  const indicator = document.createElement("i");
  indicator.id = SHIFT_COLLECTION_INDICATOR_ID;
  indicator.classList.add("fa-solid", "fa-wand-magic-sparkles", "inline", BASE_INDICATOR_CLASS);

  indicator.title = SHIFT_COLLECTION_TOOLTIP;
  indicator.setAttribute("aria-label", SHIFT_COLLECTION_TOOLTIP);
  indicator.setAttribute("role", "img");
  indicator.dataset.shiftAiIndicatorTooltip = SHIFT_COLLECTION_TOOLTIP;

  container.appendChild(indicator);

  return indicator;
};

export const useIndicatorManager = (sdk: FrontendSDK) => {
  let stopWatchingPage: (() => void) | undefined = undefined;
  let sessionChangeUnsubscribe: ListenerHandle | undefined = undefined;
  let storeWatchUnsubscribe: WatchStopHandle | undefined = undefined;
  let tableObserver: MutationObserver | undefined = undefined;
  let drawFrame: number | undefined = undefined;
  let collectionFrame: number | undefined = undefined;

  const sessionIndicators = new Map<string, SessionIndicatorEntry>();

  const scheduleDrawIndicators = () => {
    drawFrame ??= requestAnimationFrame(() => {
      drawFrame = undefined;
      drawIndicators();
    });
  };

  const start = () => {
    stopWatchingPage ??= watchReplayPage(sdk, inject, cleanup);
  };

  const inject = () => {
    cleanupSubscriptions();

    const agentStore = useAgentStore();

    storeWatchUnsubscribe = watch(
      () => {
        return Array.from(agentStore.indicatorStates.entries())
          .map(([sessionId, state]) => `${sessionId}:${state.status}:${state.hasMessages ? 1 : 0}`)
          .sort()
          .join("|");
      },
      () => {
        scheduleDrawIndicators();
      },
      { immediate: true }
    );

    sessionChangeUnsubscribe = sdk.replay.onCurrentSessionChange(() => {
      scheduleDrawIndicators();
    });

    collectionFrame = requestAnimationFrame(() => {
      collectionFrame = undefined;
      listenForCollectionChanges();
    });
  };

  const drawIndicators = () => {
    drawSessionIndicators();
    drawShiftCollectionIndicator();
  };

  const getShiftCollection = (): HTMLDivElement | undefined => {
    const collections = sdk.replay.getCollections();
    const collection = collections.find((c) => c.name === "Shift");
    if (collection === undefined) {
      return undefined;
    }

    const collectionId = collection.id;
    if (collectionId === undefined) {
      return undefined;
    }

    const element = document.querySelector(`[data-collection-id="${collectionId}"]`);
    if (element === null) {
      return undefined;
    }

    return element as HTMLDivElement;
  };

  const drawSessionIndicators = () => {
    const agentStore = useAgentStore();
    const sessions = sdk.replay.getSessions();

    const activeSessionIds = new Set<string>();

    for (const replaySession of sessions) {
      const sessionId = replaySession.id;
      const indicatorState = agentStore.indicatorStates.get(sessionId);
      if (indicatorState === undefined || !indicatorState.hasMessages) {
        if (sessionIndicators.has(sessionId)) {
          sessionIndicators.get(sessionId)?.indicator.remove();
          sessionIndicators.delete(sessionId);
        }
        continue;
      }

      activeSessionIds.add(sessionId);

      const icon = getIconFromChatStatus(indicatorState.status);
      const description = getDescriptionFromChatStatus(indicatorState.status);

      const existing = sessionIndicators.get(sessionId);
      if (
        existing !== undefined &&
        existing.icon === icon &&
        existing.description === description
      ) {
        continue;
      }

      if (existing !== undefined) {
        existing.indicator.remove();
      }

      const indicator = sdk.replay.addSessionIndicator(sessionId, {
        icon,
        description,
        showTabIcon: true,
      });
      sessionIndicators.set(sessionId, {
        indicator,
        icon,
        description,
      });
    }

    for (const [sessionId, indicator] of sessionIndicators) {
      if (!activeSessionIds.has(sessionId)) {
        indicator.indicator.remove();
        sessionIndicators.delete(sessionId);
      }
    }
  };

  const drawShiftCollectionIndicator = () => {
    const shiftCollection = getShiftCollection();
    if (!shiftCollection) {
      return;
    }

    createShiftCollectionIndicator(shiftCollection);
  };

  const listenForCollectionChanges = () => {
    if (tableObserver) {
      tableObserver.disconnect();
    }

    const table = document.querySelector("table");
    if (table === null) {
      return;
    }

    tableObserver = new MutationObserver(() => {
      scheduleDrawIndicators();
    });

    tableObserver.observe(table, {
      childList: true,
      subtree: true,
    });
  };

  const cleanupSubscriptions = () => {
    if (storeWatchUnsubscribe) {
      storeWatchUnsubscribe();
      storeWatchUnsubscribe = undefined;
    }
    if (sessionChangeUnsubscribe) {
      sessionChangeUnsubscribe.stop();
      sessionChangeUnsubscribe = undefined;
    }
    if (tableObserver) {
      tableObserver.disconnect();
      tableObserver = undefined;
    }
    if (drawFrame !== undefined) {
      cancelAnimationFrame(drawFrame);
      drawFrame = undefined;
    }
    if (collectionFrame !== undefined) {
      cancelAnimationFrame(collectionFrame);
      collectionFrame = undefined;
    }
  };

  const cleanup = () => {
    cleanupSubscriptions();
    removeIndicators();
  };

  const stop = () => {
    stopWatchingPage?.();
    stopWatchingPage = undefined;
    cleanup();
  };

  const removeIndicators = () => {
    for (const indicator of sessionIndicators.values()) {
      indicator.indicator.remove();
    }
    sessionIndicators.clear();

    const domIndicators = document.querySelectorAll(`.${BASE_INDICATOR_CLASS}`);
    domIndicators.forEach((indicator) => indicator.remove());
  };

  return {
    start,
    stop,
  };
};
