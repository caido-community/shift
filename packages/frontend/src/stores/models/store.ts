import { defineStore } from "pinia";
import { type Model } from "shared";
import { readonly, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { listCaidoModels, listUpstreamProviders, onCaidoModelsChange } from "@/utils/caidoAi";

export const useModelsStore = defineStore("models", () => {
  const sdk = useSDK();
  const models = ref<Model[]>([]);
  const isLoading = ref(true);
  const hasProvider = ref(false);

  const refresh = () => {
    models.value = listCaidoModels(sdk);
    hasProvider.value = listUpstreamProviders(sdk).length > 0;
    isLoading.value = false;
  };

  const getEnabledModels = () => models.value;

  function initialize() {
    refresh();
    onCaidoModelsChange(sdk, refresh);
  }

  return {
    isLoading: readonly(isLoading),
    hasProvider: readonly(hasProvider),
    getEnabledModels,
    initialize,
  };
});
