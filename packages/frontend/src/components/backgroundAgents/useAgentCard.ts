import { computed, type MaybeRefOrGetter, toValue } from "vue";

import {
  type BackgroundAgent,
  type BackgroundAgentLog,
  type BackgroundAgentStatus,
  useBackgroundAgentsStore,
} from "@/stores/backgroundAgents";

const STATUS_ICON_CLASS: Record<BackgroundAgentStatus, string> = {
  queued: "fas fa-clock text-surface-400",
  running: "fas fa-circle-notch fa-spin text-secondary-400",
  done: "fas fa-check-circle text-success-500",
  error: "fas fa-times-circle text-error-500",
  aborted: "fas fa-ban text-surface-500",
};

const LOG_TEXT_CLASS: Record<BackgroundAgentLog["level"], string> = {
  info: "text-surface-300",
  success: "text-surface-300",
  error: "text-error-300",
};

export function useAgentCard(agentSource: MaybeRefOrGetter<BackgroundAgent>) {
  const store = useBackgroundAgentsStore();
  const agent = computed(() => toValue(agentSource));

  const statusIconClass = computed(() => STATUS_ICON_CLASS[agent.value.status]);
  const isRunning = computed(() => agent.value.status === "running");
  const canCancel = computed(
    () => agent.value.status === "queued" || agent.value.status === "running"
  );

  const toggleExpanded = () => {
    store.toggleExpanded(agent.value.id);
  };

  const cancelAgent = () => {
    store.cancelAgent(agent.value.id);
  };

  const removeAgent = () => {
    store.removeAgent(agent.value.id);
  };

  const logTextClass = (log: BackgroundAgentLog) => LOG_TEXT_CLASS[log.level];

  return {
    canCancel,
    isRunning,
    statusIconClass,
    toggleExpanded,
    cancelAgent,
    removeAgent,
    logTextClass,
  };
}
