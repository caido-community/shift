import { computed } from "vue";

import { useSession } from "../useSession";

import { useSDK } from "@/plugins/sdk";
import { isAnyProviderConfigured } from "@/utils/ai";

export function useContent() {
  const sdk = useSDK();
  const session = useSession();

  const hasProviderConfigured = computed(() => isAnyProviderConfigured(sdk));
  const hasMessages = computed(() => session.chat.messages.length > 0);

  return {
    hasProviderConfigured,
    hasMessages,
  };
}
