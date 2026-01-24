import { type ListenerHandle } from "@caido/sdk-frontend";
import { type ChatStatus } from "ai";
import { watch, type WatchStopHandle } from "vue";

import { useAgentStore } from "@/stores/agent";
import { type FrontendSDK } from "@/types";

type IndicatorStatus = "streaming" | "error" | "idle";
type IndicatorType = "tab" | "collection";

const BASE_INDICATOR_CLASS = "internal-shift-indicator";
const TOOLTIP = "This {{ type }} is controlled by Shift AI";
const SHIFT_COLLECTION_TOOLTIP = "Managed by Shift AI";
const SHIFT_COLLECTION_INDICATOR_ID = `${BASE_INDICATOR_CLASS}-shift-collection`;

const getIndicatorStatusFromChatStatus = (status: ChatStatus): IndicatorStatus => {
  if (status === "error") {
    return "error";
  }
  if (status === "streaming" || status === "submitted") {
    return "streaming";
  }
  return "idle";
};

const getStatusClass = (status: IndicatorStatus): string | undefined => {
  switch (status) {
    case "streaming":
      return "text-success-500";
    case "error":
      return "text-error-500";
    default:
      return undefined;
  }
};

const createIndicator = (
  container: Element,
  type: IndicatorType,
  sessionId: string,
  status: IndicatorStatus
): HTMLElement => {
  const id = `${BASE_INDICATOR_CLASS}-${type}-${sessionId}`;
  const tooltip = TOOLTIP.replace("{{ type }}", type);

  const existing = container.querySelector<HTMLElement>(`#${id}`);
  if (existing) {
    existing.classList.remove("text-success-500", "text-error-500");

    const statusClass = getStatusClass(status);
    if (statusClass !== undefined) {
      existing.classList.add(statusClass);
    }

    existing.title = tooltip;
    existing.setAttribute("aria-label", tooltip);
    existing.dataset.shiftAiIndicatorTooltip = tooltip;
    return existing;
  }

  const oldIndicators = container.querySelectorAll(`.${BASE_INDICATOR_CLASS}`);
  oldIndicators.forEach((indicator) => indicator.remove());

  const indicator = document.createElement("i");
  indicator.id = id;
  indicator.classList.add("fa-solid", "fa-wand-magic-sparkles", "inline", BASE_INDICATOR_CLASS);

  const statusClass = getStatusClass(status);
  if (statusClass !== undefined) {
    indicator.classList.add(statusClass);
  }

  indicator.title = tooltip;
  indicator.setAttribute("aria-label", tooltip);
  indicator.setAttribute("role", "img");
  indicator.dataset.shiftAiIndicatorTooltip = tooltip;

  switch (type) {
    case "collection": {
      const insertBeforeTarget = container.children.item(1);
      container.insertBefore(indicator, insertBeforeTarget);
      break;
    }
    case "tab": {
      container.insertBefore(indicator, container.children.item(0));
      break;
    }
  }

  return indicator;
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
  let pageChangeUnsubscribe: { stop: () => void } | undefined = undefined;
  let sessionChangeUnsubscribe: ListenerHandle | undefined = undefined;
  let storeWatchUnsubscribe: WatchStopHandle | undefined = undefined;
  let tableObserver: MutationObserver | undefined = undefined;

  const start = () => {
    if (location.hash === "#/replay") {
      inject();
    }

    pageChangeUnsubscribe = sdk.navigation.onPageChange((event) => {
      if (event.path === "/replay") {
        inject();
      } else {
        cleanup();
      }
    });
  };

  const inject = () => {
    cleanupSubscriptions();

    const agentStore = useAgentStore();

    storeWatchUnsubscribe = watch(
      () => agentStore.state.sessions,
      () => {
        requestAnimationFrame(() => {
          drawIndicators();
        });
      },
      { immediate: true, deep: true }
    );

    sessionChangeUnsubscribe = sdk.replay.onCurrentSessionChange(() => {
      requestAnimationFrame(() => {
        drawIndicators();
      });
    });

    requestAnimationFrame(() => {
      listenForCollectionChanges();
    });
  };

  const drawIndicators = () => {
    drawTabIndicators();
    drawCollectionIndicators();
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

  const drawTabIndicators = () => {
    const agentStore = useAgentStore();

    const tabs = document.querySelectorAll("[data-draggable] [data-session-id]");

    tabs.forEach((tab) => {
      const sessionId = tab.getAttribute("data-session-id");
      if (sessionId === null || sessionId.length === 0) {
        return;
      }

      const button = tab.querySelector("button");
      if (button === null) {
        return;
      }

      if (!agentStore.state.sessions.has(sessionId)) {
        return;
      }

      const session = agentStore.getSession(sessionId);
      if (session === undefined || session.chat.messages.length === 0) {
        const existingIndicator = button.querySelector(`.${BASE_INDICATOR_CLASS}`);
        if (existingIndicator) {
          existingIndicator.remove();
        }
        return;
      }

      const status = getIndicatorStatusFromChatStatus(session.chat.status);
      createIndicator(button, "tab", sessionId, status);
    });
  };

  const drawCollectionIndicators = () => {
    const agentStore = useAgentStore();

    const entries = document.querySelectorAll("[data-is-draggable][data-id]");

    entries.forEach((entry) => {
      const id = entry.getAttribute("data-id");
      if (id === null || id.length === 0 || !id.startsWith("session-")) {
        return;
      }

      const sessionId = id.slice(8);
      const group = entry.querySelector(".group");
      if (group === null) {
        return;
      }

      const expectedIndicatorId = `${BASE_INDICATOR_CLASS}-collection-${sessionId}`;
      const existingIndicator = group.querySelector(`.${BASE_INDICATOR_CLASS}`);
      if (existingIndicator && existingIndicator.id !== expectedIndicatorId) {
        existingIndicator.remove();
      }

      if (!agentStore.state.sessions.has(sessionId)) {
        return;
      }

      const session = agentStore.getSession(sessionId);
      if (session === undefined || session.chat.messages.length === 0) {
        const existingIndicator = group.querySelector(`.${BASE_INDICATOR_CLASS}`);
        if (existingIndicator) {
          existingIndicator.remove();
        }
        return;
      }

      const status = getIndicatorStatusFromChatStatus(session.chat.status);
      createIndicator(group, "collection", sessionId, status);
    });
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
      requestAnimationFrame(() => {
        drawCollectionIndicators();
        drawShiftCollectionIndicator();
      });
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
  };

  const cleanup = () => {
    cleanupSubscriptions();
    removeIndicators();
  };

  const stop = () => {
    if (pageChangeUnsubscribe) {
      pageChangeUnsubscribe.stop();
      pageChangeUnsubscribe = undefined;
    }
    cleanup();
  };

  const removeIndicators = () => {
    const indicators = document.querySelectorAll(`.${BASE_INDICATOR_CLASS}`);
    indicators.forEach((indicator) => indicator.remove());
  };

  return {
    start,
    stop,
  };
};
