import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { queryShift } from "@/float";
import { getContext } from "@/float/context";
import { useSDK } from "@/plugins/sdk";
import { isPresent } from "@/utils/optional";

export const useFloatStore = defineStore("float", () => {
  const sdk = useSDK();
  const textarea = ref<HTMLTextAreaElement | undefined>(undefined);
  const query = shallowRef<string>("");
  const isRunning = shallowRef(false);
  const historyIndex = shallowRef<number>(-1);
  const history = shallowRef<string[]>([]);
  const abortController = shallowRef<AbortController | undefined>(undefined);

  const addHistoryEntry = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return;

    const currentHistory = history.value;
    if (currentHistory[currentHistory.length - 1] === trimmed) return;

    history.value = [...currentHistory, trimmed];
  };

  const getHistoryAtIndex = (index: number): string | undefined => {
    return history.value[history.value.length - 1 - index];
  };

  const isCaretOnEdge = (element: HTMLTextAreaElement, edge: "first" | "last"): boolean => {
    const caret = element.selectionStart ?? 0;
    const value = element.value;
    if (edge === "first") {
      return caret === 0 || !value.slice(0, caret).includes("\n");
    }
    return caret >= value.lastIndexOf("\n") + 1;
  };

  const navigateHistory = (direction: "prev" | "next") => {
    const nextIndex = direction === "prev" ? historyIndex.value + 1 : historyIndex.value - 1;
    const clampedIndex = Math.min(nextIndex, history.value.length - 1);

    historyIndex.value = clampedIndex;
    query.value = clampedIndex < 0 ? "" : (getHistoryAtIndex(clampedIndex) ?? "");

    setTimeout(() => {
      const el = textarea.value;
      if (isPresent(el)) {
        const pos = direction === "prev" ? 0 : el.value.length;
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const focusTextarea = () => {
    const textareaElement = textarea.value;
    if (isPresent(textareaElement)) {
      textareaElement.focus();
    }
  };

  const closeFloat = () => {
    const floatElement = document.querySelector("[data-plugin='shift-float']");
    if (isPresent(floatElement)) {
      floatElement.remove();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeFloat();
    }

    if (event.key === "Enter" && !event.shiftKey) {
      runQuery();
      event.preventDefault();
      return;
    }

    const textareaElement = textarea.value;
    if (!isPresent(textareaElement)) return;

    if (
      event.key === "ArrowUp" &&
      history.value.length > 0 &&
      isCaretOnEdge(textareaElement, "first")
    ) {
      navigateHistory("prev");
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      event.key === "ArrowDown" &&
      historyIndex.value >= 0 &&
      isCaretOnEdge(textareaElement, "last")
    ) {
      navigateHistory("next");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  };

  const stopQuery = () => {
    const controller = abortController.value;
    if (isPresent(controller)) {
      controller.abort("USER_ABORTED");
      abortController.value = undefined;
    }
  };

  const runQuery = async () => {
    const content = query.value.trim();
    if (content.length === 0 || isRunning.value) {
      return;
    }

    const controller = new AbortController();
    abortController.value = controller;
    isRunning.value = true;
    historyIndex.value = -1;

    try {
      const result = await queryShift(sdk, {
        content,
        context: getContext(sdk),
        abortSignal: controller.signal,
      });

      switch (result.kind) {
        case "Ok":
          addHistoryEntry(content);
          query.value = "";
          closeFloat();
          break;
        case "Error":
          if (result.error === "USER_ABORTED") {
            return;
          }

          console.error(result.error);
          sdk.window.showToast(result.error, {
            variant: "error",
          });
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message === "USER_ABORTED") {
        return;
      }

      sdk.window.showToast(message, {
        variant: "error",
      });
    } finally {
      isRunning.value = false;
      abortController.value = undefined;
    }
  };

  return {
    isRunning: computed(() => isRunning.value),
    canSendMessage: computed(() => {
      const content = query.value.trim();
      return !isRunning.value && content.length > 0;
    }),
    query,
    textarea,
    closeFloat,
    runQuery,
    stopQuery,
    focusTextarea,
    handleKeydown,
  };
});
