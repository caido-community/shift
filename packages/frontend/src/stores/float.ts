import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { queryShift } from "@/float";
import { getContext } from "@/float/context";
import { useSDK } from "@/plugins/sdk";
import { useConfigStore } from "@/stores/config";

export const useFloatStore = defineStore("stores.float", () => {
  const sdk = useSDK();
  const configStore = useConfigStore();

  const textarea = ref<HTMLTextAreaElement | undefined>(undefined);
  const query = ref<string>("");

  const isRunning = ref(false);

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
    if (content.length === 0 || isRunning.value) {
      return;
    }

    isRunning.value = true;
    historyIndex.value = -1;

    try {
      const result = await queryShift(sdk, {
        content,
        context: getContext(sdk),
      });

      if (result.success) {
        query.value = "";
        configStore.addHistoryEntry(content);
        closeFloat();
      } else {
        sdk.window.showToast(result.error, {
          variant: "error",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sdk.window.showToast(message, {
        variant: "error",
      });
    } finally {
      isRunning.value = false;
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
    focusTextarea,
    handleKeydown,
  };
});
