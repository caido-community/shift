import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

import { closeFloat, queryShift } from "@/float";
import { getContext } from "@/float/context";
import { useSDK } from "@/plugins/sdk";

export const useFloatStore = defineStore("float", () => {
  const sdk = useSDK();
  const query = shallowRef<string>("");
  const historyIndex = shallowRef<number>(-1);
  const history = shallowRef<string[]>([]);
  const abortController = shallowRef<AbortController | undefined>(undefined);
  const isRunning = computed(() => abortController.value !== undefined);

  const addHistoryEntry = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return;

    const currentHistory = history.value;
    if (currentHistory[currentHistory.length - 1] === trimmed) return;

    history.value = [...currentHistory, trimmed];
  };

  const navigateHistory = (direction: "prev" | "next"): boolean => {
    const canNavigate = direction === "prev" ? history.value.length > 0 : historyIndex.value >= 0;
    if (!canNavigate) return false;

    const nextIndex = Math.min(
      historyIndex.value + (direction === "prev" ? 1 : -1),
      history.value.length - 1
    );
    historyIndex.value = nextIndex;
    query.value = nextIndex < 0 ? "" : (history.value[history.value.length - 1 - nextIndex] ?? "");
    return true;
  };

  const stopQuery = () => {
    abortController.value?.abort();
  };

  const runQuery = async () => {
    const content = query.value.trim();
    if (content.length === 0 || isRunning.value) {
      return;
    }

    const controller = new AbortController();
    abortController.value = controller;
    historyIndex.value = -1;

    try {
      const result = await queryShift(sdk, {
        content,
        context: await getContext(sdk),
        abortSignal: controller.signal,
      });

      switch (result.kind) {
        case "Ok":
          addHistoryEntry(content);
          query.value = "";
          closeFloat();
          break;
        case "Error":
          if (controller.signal.aborted) {
            return;
          }

          console.error(result.error);
          sdk.window.showToast(result.error, {
            variant: "error",
          });
          break;
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      sdk.window.showToast(message, {
        variant: "error",
      });
    } finally {
      abortController.value = undefined;
    }
  };

  return {
    isRunning,
    canSendMessage: computed(() => !isRunning.value && query.value.trim().length > 0),
    query,
    runQuery,
    stopQuery,
    navigateHistory,
  };
});
