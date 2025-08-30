import { ref, toRefs } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useConfigStore } from "@/stores/config/store";

export const useForm = () => {
  const sdk = useSDK();
  const configStore = useConfigStore();
  const { openRouterApiKey, maxIterations } = toRefs(configStore);

  const isApiKeyVisible = ref(false);
  const isValidating = ref(false);

  const toggleApiKeyVisibility = () => {
    isApiKeyVisible.value = !isApiKeyVisible.value;
  };

  const validateApiKey = async () => {
    if (!openRouterApiKey.value) {
      sdk.window.showToast("Please enter an API key", { variant: "error" });
      return;
    }

    try {
      isValidating.value = true;
      const response = await fetch("https://openrouter.ai/api/v1/credits", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${openRouterApiKey.value}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        sdk.window.showToast("API key is valid", { variant: "success" });
      } else {
        if (response.status === 401) {
          sdk.window.showToast("Invalid API key", { variant: "error" });
        } else {
          sdk.window.showToast(`Validation failed: ${response.status}`, {
            variant: "error",
          });
        }
      }
    } catch (error) {
      sdk.window.showToast("Network error: Unable to validate API key", {
        variant: "error",
      });
    } finally {
      isValidating.value = false;
    }
  };

  return {
    openRouterApiKey,
    maxIterations,
    isApiKeyVisible,
    isValidating,
    toggleApiKeyVisibility,
    validateApiKey,
  };
};
