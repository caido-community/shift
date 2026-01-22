import { computed } from "vue";

import { useSession } from "../useSession";

export function useQueue() {
  const session = useSession();

  const queuedMessages = computed(() => session.queuedMessages);
  const hasQueue = computed(() => queuedMessages.value.length > 0);

  function sendNow(id: string) {
    session.sendFromQueue(id);
  }

  function remove(id: string) {
    session.removeFromQueue(id);
  }

  return {
    queuedMessages,
    hasQueue,
    sendNow,
    remove,
  };
}
