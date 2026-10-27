import { computed } from "vue";

import { useSession } from "../useSession";

import { useModelsStore } from "@/stores/models";

export function useContent() {
  const modelsStore = useModelsStore();
  const session = useSession();

  return {
    hasProviderConfigured: computed(() => modelsStore.hasProvider),
    hasMessages: computed(() => session.chat.messages.length > 0),
  };
}
