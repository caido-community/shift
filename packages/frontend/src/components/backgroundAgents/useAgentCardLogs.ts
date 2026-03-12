import { useScroll } from "@vueuse/core";
import { computed, type MaybeRefOrGetter, nextTick, toValue, useTemplateRef, watch } from "vue";

import type { BackgroundAgent } from "@/stores/backgroundAgents";

export function useAgentCardLogs(agentSource: MaybeRefOrGetter<BackgroundAgent>) {
  const logsContainer = useTemplateRef<HTMLElement>("logsContainer");
  const { arrivedState } = useScroll(logsContainer);

  const latestLogId = computed(() => {
    const agent = toValue(agentSource);
    return agent.logs[agent.logs.length - 1]?.id;
  });

  const scrollToBottom = async (force: boolean) => {
    const container = logsContainer.value;
    if (container === null) {
      return;
    }

    await nextTick();

    if (!force && !arrivedState.bottom) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  };

  watch(
    logsContainer,
    async (container) => {
      if (container === null) {
        return;
      }

      await scrollToBottom(true);
    },
    { flush: "post" }
  );

  watch(
    () => toValue(agentSource).logs.length,
    async (current, previous) => {
      if (current === previous) {
        return;
      }

      await scrollToBottom(previous === 0);
    },
    { flush: "post" }
  );

  return {
    latestLogId,
  };
}
