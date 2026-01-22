import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";

import { fetchLearnings } from "./store.effects";
import { initialModel, type LearningsMessage, type LearningsModel } from "./store.model";
import { update } from "./store.update";

import { useSDK } from "@/plugins/sdk";

export const useLearningsStore = defineStore("learnings", () => {
  const sdk = useSDK();
  const model = ref<LearningsModel>(initialModel);

  function dispatch(message: LearningsMessage) {
    model.value = update(model.value, message);
  }

  const config = computed(() => model.value.config);
  const isLoading = computed(() => model.value.isLoading);
  const error = computed(() => model.value.error);
  const entries = computed(() => model.value.config?.entries ?? []);

  async function initialize() {
    await fetchLearnings(sdk, dispatch);
  }

  return {
    state: readonly(model),
    sdk,
    dispatch,
    config,
    isLoading,
    error,
    entries,
    initialize,
  };
});
