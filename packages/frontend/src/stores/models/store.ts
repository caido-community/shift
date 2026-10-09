import { defineStore } from "pinia";
import { type Model } from "shared";
import { readonly, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { listCaidoModels, onCaidoModelsChange } from "@/utils/caidoAi";

export const useModelsStore = defineStore("models", () => {
  const sdk = useSDK();
  const models = ref<Model[]>([]);
  const isLoading = ref(true);

  const refresh = () => {
    models.value = listCaidoModels(sdk);
    isLoading.value = false;
  };

  const getEnabledModels = () => models.value;

  function initialize() {
    refresh();
    onCaidoModelsChange(sdk, refresh);
  }

  return {
    isLoading: readonly(isLoading),
    getEnabledModels,
    initialize,
  };
});
