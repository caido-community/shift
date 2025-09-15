import { onLocationChange } from "@/dom";
import { type FrontendSDK } from "@/types";

export const useSessionManager = (sdk: FrontendSDK) => {
  let currentSelectedId: string | undefined = undefined;
  let observer: MutationObserver | undefined = undefined;
  let unsubscribe: (() => void) | undefined = undefined;
  let onSelectedCallback:
    | ((sessionId: string | undefined) => void)
    | undefined = undefined;

  const start = () => {
    if (location.hash === "#/replay") {
      inject();
    }

    unsubscribe = onLocationChange(({ newHash }) => {
      if (newHash === "#/replay") {
        inject();
      } else {
        remove();
      }
    });

    monitorProjectChanges();
  };

  const stop = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
    }
    remove();
  };

  const remove = () => {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  };

  const onSelected = (callback: (sessionId: string | undefined) => void) => {
    onSelectedCallback = callback;
  };

  const inject = () => {
    const treeCollection =
      document.querySelector(".c-tree-collection")?.parentElement;
    if (!treeCollection) {
      setTimeout(inject, 100);
      return;
    }

    selectCurrentSession();

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-is-selected"
        ) {
          const target = mutation.target as Element;
          if (target.classList.contains("c-tree-session")) {
            const isSelected =
              target.getAttribute("data-is-selected") === "true";
            const sessionId =
              target.getAttribute("data-session-id") ?? undefined;

            if (
              isSelected &&
              sessionId !== undefined &&
              sessionId !== currentSelectedId
            ) {
              currentSelectedId = sessionId;
              if (onSelectedCallback) {
                onSelectedCallback(sessionId);
              }
            } else if (!isSelected && sessionId === currentSelectedId) {
              currentSelectedId = undefined;
              if (onSelectedCallback) {
                onSelectedCallback(undefined);
              }
            }
          }
        }
      });
    });

    observer.observe(treeCollection, {
      attributes: true,
      attributeFilter: ["data-is-selected"],
      subtree: true,
    });

    const initialSelected = treeCollection.querySelector(
      '.c-tree-session[data-is-selected="true"]',
    );
    if (initialSelected) {
      const sessionId =
        initialSelected.getAttribute("data-session-id") ?? undefined;
      if (sessionId !== undefined) {
        currentSelectedId = sessionId;
        if (onSelectedCallback) {
          onSelectedCallback(sessionId);
        }
      }
    }
  };

  const selectCurrentSession = () => {
    const currentSessionId = getCurrentSessionId();
    if (currentSessionId !== undefined) {
      if (onSelectedCallback) {
        onSelectedCallback(currentSessionId);
      }
    }
  };

  const getCurrentSessionId = () => {
    const treeCollection =
      document.querySelector(".c-tree-collection")?.parentElement;
    if (!treeCollection) {
      return undefined;
    }

    const currentSelected = treeCollection.querySelector(
      '.c-tree-session[data-is-selected="true"]',
    );
    if (!currentSelected) {
      return undefined;
    }
    return currentSelected.getAttribute("data-session-id") ?? undefined;
  };

  const monitorProjectChanges = async () => {
    try {
      const iterator = sdk.graphql.updatedProject();
      for await (const _ of iterator) {
        setTimeout(() => {
          remove();
          inject();
        }, 50);
      }
    } catch {
      // do nothing
    }
  };

  return {
    start,
    stop,
    onSelected,
  };
};
