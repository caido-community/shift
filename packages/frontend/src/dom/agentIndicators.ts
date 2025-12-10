import { type ListenerHandle } from "@caido/sdk-frontend";

import { type AgentStatusSnapshot, useAgentsStore } from "@/stores/agents";
import { type FrontendSDK } from "@/types";

const BASE_INDICATOR_CLASS = "internal-shift-indicator";
const TOOLTIP = "This {{ type }} is controlled by Shift AI";

const createIndicator = (
  container: Element,
  type: "collection" | "tab",
  sessionId: string,
  state: AgentStatusSnapshot,
) => {
  const id = BASE_INDICATOR_CLASS + "-" + type + "-" + sessionId;
  const tooltip = TOOLTIP.replace("{{ type }}", type);
  const existing = container.querySelector<HTMLElement>(`#${id}`);
  if (existing) {
    existing.classList.remove("text-success-500", "text-error-500");

    if (state.status === "streaming") {
      existing.classList.add("text-success-500");
    } else if (state.status === "error") {
      existing.classList.add("text-error-500");
    }

    existing.title = tooltip;
    existing.setAttribute("aria-label", tooltip);
    existing.dataset.shiftAiIndicatorTooltip = tooltip;
    return existing;
  }

  const oldIndicators = container.querySelectorAll(`.${BASE_INDICATOR_CLASS}`);
  oldIndicators.forEach((indicator) => {
    indicator.remove();
  });

  const indicator = document.createElement("i");
  indicator.id = id;
  indicator.classList.add(
    "fa-solid",
    "fa-wand-magic-sparkles",
    "inline",
    BASE_INDICATOR_CLASS,
  );

  switch (state.status) {
    case "streaming":
      indicator.classList.add("text-success-500");
      break;
    case "error":
      indicator.classList.add("text-error-500");
      break;
    default:
      break;
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

export const useAgentIndicatorManager = (sdk: FrontendSDK) => {
  const agentsStore = useAgentsStore();
  let unsubscribe: { stop: () => void } | undefined = undefined;
  let agentStatesUnsubscribe: (() => void) | undefined = undefined;
  let sessionChangeUnsubscribe: ListenerHandle | undefined = undefined;
  let tableObserver: MutationObserver | undefined = undefined;

  const start = () => {
    if (location.hash === "#/replay") {
      inject();
    }

    unsubscribe = sdk.navigation.onPageChange((event) => {
      if (event.path === "/replay") {
        inject();
      } else {
        remove();
      }
    });
  };

  const inject = () => {
    if (agentStatesUnsubscribe) {
      agentStatesUnsubscribe();
    }

    if (sessionChangeUnsubscribe) {
      sessionChangeUnsubscribe.stop();
    }

    agentStatesUnsubscribe = agentsStore.subscribeToAgentStates((snapshot) => {
      requestAnimationFrame(() => {
        drawTabIndicators(snapshot);
        drawCollectionIndicators(snapshot);
      });
    });

    sessionChangeUnsubscribe = sdk.replay.onCurrentSessionChange(() => {
      const snapshot = agentsStore.getAgentStatusSnapshot();
      requestAnimationFrame(() => {
        drawTabIndicators(snapshot);
        drawCollectionIndicators(snapshot);
      });
    });

    listenForCollectionChanges();
  };

  const drawTabIndicators = (snapshots: AgentStatusSnapshot[]) => {
    const tabs = document.querySelectorAll(
      "[data-draggable] [data-session-id]",
    );
    tabs.forEach((tab) => {
      const sessionId = tab.getAttribute("data-session-id");
      if (sessionId === null || sessionId.length === 0) {
        return;
      }

      const button = tab.querySelector("button");
      if (button === null) {
        return;
      }

      const snapshot = snapshots.find((s) => s.sessionId === sessionId);
      if (snapshot === undefined || snapshot.numMessages === 0) {
        return;
      }

      createIndicator(button, "tab", sessionId, snapshot);
    });
  };

  const drawCollectionIndicators = (snapshots: AgentStatusSnapshot[]) => {
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

      const snapshot = snapshots.find((s) => s.sessionId === sessionId);
      if (snapshot === undefined || snapshot.numMessages === 0) {
        return;
      }

      createIndicator(group, "collection", sessionId, snapshot);
    });
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
      console.log("Collection changed");
      const snapshot = agentsStore.getAgentStatusSnapshot();
      requestAnimationFrame(() => {
        drawCollectionIndicators(snapshot);
      });
    });

    tableObserver.observe(table, {
      childList: true,
      subtree: true,
    });
  };

  const stop = () => {
    if (unsubscribe) {
      unsubscribe.stop();
      unsubscribe = undefined;
    }
    if (agentStatesUnsubscribe) {
      agentStatesUnsubscribe();
      agentStatesUnsubscribe = undefined;
    }
    if (sessionChangeUnsubscribe) {
      sessionChangeUnsubscribe.stop();
      sessionChangeUnsubscribe = undefined;
    }
    if (tableObserver) {
      tableObserver.disconnect();
      tableObserver = undefined;
    }
    remove();
  };

  const remove = () => {
    const indicators = document.querySelectorAll(`.${BASE_INDICATOR_CLASS}`);
    indicators.forEach((indicator) => {
      indicator.remove();
    });
  };

  return {
    start,
    stop,
  };
};
