import { useEventListener, useResizeObserver, useScroll } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";

import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";

export const useSelector = (agentId?: string) => {
  const configStore = useConfigStore();
  const uiStore = useUIStore();
  const agentStore = useAgentsStore();

  const effectiveAgentId = computed(() => agentId ?? agentStore.selectedId ?? "");

  const selectedPromptIds = computed({
    get() {
      return uiStore.getSelectedPrompts(effectiveAgentId.value);
    },
    set(value: string[]) {
      uiStore.setSelectedPrompts(effectiveAgentId.value, value);
    },
  });

  const promptOptions = computed(() => configStore.customPrompts);

  const isSelected = (id: string) => selectedPromptIds.value.includes(id);

  const togglePrompt = (id: string) => {
    const current = new Set(selectedPromptIds.value);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    selectedPromptIds.value = Array.from(current);
  };

  const selectedPrompts = computed(() =>
    selectedPromptIds.value
      .map((id) => promptOptions.value.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined),
  );

  const listRef = ref<HTMLDivElement | undefined>(undefined);
  const hasOverflow = ref(false);
  const { arrivedState } = useScroll(listRef);
  const showLeft = computed(() => hasOverflow.value && !arrivedState.left);
  const showRight = computed(() => hasOverflow.value && !arrivedState.right);

  const updateOverflow = () => {
    const el = listRef.value;
    if (el === undefined) {
      hasOverflow.value = false;
      return;
    }
    hasOverflow.value = el.scrollWidth - el.clientWidth > 1;
  };

  const onScroll = () => updateOverflow();

  const scrollByAmount = (amount: number) => {
    const el = listRef.value;
    if (el !== undefined) {
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const scrollLeftBy = () => {
    const el = listRef.value;
    scrollByAmount(-((el?.clientWidth ?? 200) * 0.8));
  };

  const scrollRightBy = () => {
    const el = listRef.value;
    scrollByAmount((el?.clientWidth ?? 200) * 0.8);
  };

  let stopWindowListener: (() => void) | undefined;
  const bindScrollHandlers = () => {
    const el = listRef.value;
    if (el !== undefined) {
      el.addEventListener("scroll", onScroll);
    }
    if (stopWindowListener === undefined) {
      stopWindowListener = useEventListener(window, "resize", updateOverflow);
    }
    requestAnimationFrame(() => {
      updateOverflow();
      if (hasOverflow.value && el !== undefined) {
        el.scrollTo({ left: el.scrollWidth, top: 0, behavior: "auto" });
      }
    });
  };

  const unbindScrollHandlers = () => {
    const el = listRef.value;
    if (el !== undefined) {
      el.removeEventListener("scroll", onScroll);
    }
    if (stopWindowListener !== undefined) {
      stopWindowListener();
      stopWindowListener = undefined;
    }
  };

  useResizeObserver(listRef, () => updateOverflow());
  watch(
    selectedPrompts,
    async () => {
      await nextTick();
      updateOverflow();
      const el = listRef.value;
      if (hasOverflow.value && el !== undefined) {
        el.scrollTo({ left: el.scrollWidth, top: 0, behavior: "auto" });
      }
    },
    { immediate: true },
  );

  return {
    selectedPromptIds,
    promptOptions,
    isSelected,
    togglePrompt,
    selectedPrompts,
    listRef,
    showLeft,
    showRight,
    hasOverflow,
    scrollLeftBy,
    scrollRightBy,
    bindScrollHandlers,
    unbindScrollHandlers,
  };
};
