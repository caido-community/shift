import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  type Ref,
  watch,
  type WatchSource,
} from "vue";

export const useAutoScroll = (
  containerRef: Ref<HTMLElement | undefined>,
  sources: Array<WatchSource<unknown>>,
  options?: {
    always?: boolean;
    smooth?: boolean;
    observeDeep?: boolean;
    bottomBufferPx?: number;
  },
) => {
  const cfg = {
    always: false,
    smooth: false,
    observeDeep: false,
    bottomBufferPx: 16,
    ...(options ?? {}),
  };
  let mutationObserver: MutationObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let detachScrollListener: (() => void) | undefined;
  const threshold = 8;
  const buffer = cfg.bottomBufferPx ?? 16;
  let wasPinned = true;

  const getEl = () => {
    const el = containerRef.value;
    if (el === undefined) return undefined;
    return el;
  };

  const isPinnedNow = (el: HTMLElement) => {
    return (
      el.scrollHeight - el.clientHeight - el.scrollTop <= threshold + buffer
    );
  };

  const scrollToBottom = (force: boolean) => {
    const el = getEl();
    if (el === undefined) return;
    if (cfg.always === false && wasPinned === false && force === false) return;
    const top = el.scrollHeight;
    el.scroll({ top, behavior: cfg.smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    const el = getEl();
    if (el === undefined) return;
    wasPinned = isPinnedNow(el);
  };

  const attachObservers = () => {
    const el = getEl();
    if (el === undefined) return;
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    detachScrollListener?.();

    mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    });

    if (el !== undefined && el.nodeType === Node.ELEMENT_NODE) {
      mutationObserver.observe(el, {
        childList: true,
        characterData: true,
        subtree: cfg.observeDeep,
      });
    }

    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    });
    if (el !== undefined && el.nodeType === Node.ELEMENT_NODE) {
      resizeObserver.observe(el);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    detachScrollListener = () => {
      el.removeEventListener("scroll", handleScroll);
    };

    wasPinned = isPinnedNow(el);
  };

  onMounted(() => {
    const el = getEl();
    if (el !== undefined) {
      attachObservers();
      scrollToBottom(true);
    }
  });

  onBeforeUnmount(() => {
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    detachScrollListener?.();
  });

  watch(
    () => containerRef.value,
    (el, _prev, onCleanup) => {
      if (el === undefined) return;
      attachObservers();
      onCleanup(() => {
        mutationObserver?.disconnect();
        resizeObserver?.disconnect();
        detachScrollListener?.();
      });
    },
    { immediate: false },
  );

  watch(
    sources,
    async () => {
      await nextTick();
      scrollToBottom(false);
    },
    { deep: true, immediate: true },
  );
};
