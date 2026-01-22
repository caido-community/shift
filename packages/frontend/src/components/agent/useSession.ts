import type { AgentSession } from "@/agent/session";
import { useAgentStore } from "@/stores/agent/store";
import { isPresent } from "@/utils/optional";

export function useSession(): AgentSession {
  const store = useAgentStore();
  const fallback = store.activeSession;
  if (!isPresent(fallback)) {
    throw new Error("Active session is not available");
  }
  return fallback;
}
