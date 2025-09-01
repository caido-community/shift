import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { queryShiftStream } from "@/float";
import { getContext } from "@/float/context";
import type { QueryShiftState } from "@/float/types";
import { useSDK } from "@/plugins/sdk";
import { useConfigStore } from "@/stores/config";

export const useFloatStore = defineStore("stores.float", () => {
  const sdk = useSDK();
  const configStore = useConfigStore();

  const textarea = ref<HTMLTextAreaElement | undefined>(undefined);
  const query = ref<string>("");

  const streamState = ref<QueryShiftState>("Idle");
  const streamError = ref<string | undefined>(undefined);

  const historyIndex = ref<number>(-1);

  const focusTextarea = () => {
    const textareaElement = textarea.value;
    if (textareaElement) {
      textareaElement.focus();
    }
  };

  const closeFloat = () => {
    const floatElement = document.querySelector("[data-plugin='shift-float']");
    if (floatElement) {
      floatElement.remove();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    const isTextareaFocused = document.activeElement === textarea.value;

    if (event.key === "Escape") {
      closeFloat();
    }

    if (event.key === "ArrowUp" && isTextareaFocused) {
      const textareaElement = textarea.value;
      if (textareaElement !== undefined) {
        const caretIndex = textareaElement.selectionStart ?? 0;
        const value = textareaElement.value;
        const isTopLine =
          caretIndex === 0 || value.lastIndexOf("\n", caretIndex - 1) === -1;
        if (isTopLine) {
          const history = configStore.getHistory();
          if (history.length > 0) {
            const nextIndex = Math.min(
              historyIndex.value + 1,
              history.length - 1,
            );
            historyIndex.value = nextIndex;
            const nextContent = history[history.length - 1 - nextIndex];
            if (nextContent !== undefined) {
              query.value = nextContent;
            }
            setTimeout(() => {
              const el = textarea.value;
              if (el !== undefined) {
                el.setSelectionRange(0, 0);
              }
            }, 0);
          }
        }
      }

      event.stopPropagation();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && isTextareaFocused) {
      runQuery();
      event.preventDefault();
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.stopPropagation();
      return;
    }
  };

  const runQuery = async () => {
    const content = query.value.trim();
    if (content.length === 0) {
      return;
    }

    streamState.value = "Streaming";
    streamError.value = undefined;
    historyIndex.value = -1;

    for await (const event of queryShiftStream(sdk, {
      content,
      context: getContext(sdk),
    })) {
      switch (event.state) {
        case "Streaming":
          streamState.value = "Streaming";
          break;
        case "Done":
          streamState.value = "Idle";
          query.value = "";
          configStore.addHistoryEntry(content);
          closeFloat();
          break;
        case "Error":
          streamState.value = "Idle";
          streamError.value = event.error;
          sdk.window.showToast(event.error, {
            variant: "error",
          });
          break;
      }
    }
  };

  return {
    streamState: computed(() => streamState.value),
    canSendMessage: computed(() => {
      const content = query.value.trim();
      return streamState.value === "Idle" && content.length > 0;
    }),
    query,
    textarea,
    streamError,
    closeFloat,
    runQuery,
    focusTextarea,
    handleKeydown,
  };
});
