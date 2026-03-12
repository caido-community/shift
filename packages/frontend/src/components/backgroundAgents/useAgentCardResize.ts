import { useEventListener } from "@vueuse/core";
import {
    computed,
    nextTick,
    onUnmounted,
    ref,
    toValue,
    useTemplateRef,
    watch,
    type MaybeRefOrGetter,
} from "vue";

const VIEWPORT_GUTTER = 32;

type ResizeHandle = "top-left" | "bottom-left" | "bottom-right";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const HANDLE_CURSOR_CLASS: Record<ResizeHandle, string> = {
  "top-left": "cursor-ew-resize",
  "bottom-left": "cursor-nesw-resize",
  "bottom-right": "cursor-ns-resize",
};

const HANDLE_BODY_CURSOR: Record<ResizeHandle, string> = {
  "top-left": "ew-resize",
  "bottom-left": "nesw-resize",
  "bottom-right": "ns-resize",
};

export function useAgentCardResize(expanded: MaybeRefOrGetter<boolean>) {
  const cardElement = useTemplateRef<HTMLElement>("cardElement");
  const width = ref<number | undefined>(undefined);
  const height = ref<number | undefined>(undefined);
  const minWidth = ref(0);
  const minHeight = ref(0);
  const maxWidth = ref(0);
  const maxHeight = ref(0);
  const activeHandle = ref<ResizeHandle | undefined>(undefined);

  let stopMove: (() => void) | undefined;
  let stopUp: (() => void) | undefined;

  const cardStyle = computed(() => ({
    width: width.value === undefined ? undefined : `${width.value}px`,
    height: toValue(expanded) && height.value !== undefined ? `${height.value}px` : undefined,
  }));

  const resizeCursorClass = computed(() =>
    activeHandle.value === undefined ? undefined : HANDLE_CURSOR_CLASS[activeHandle.value]
  );

  const updateResizeBounds = () => {
    maxWidth.value = Math.max(
      minWidth.value,
      Math.min(minWidth.value * 2, window.innerWidth - VIEWPORT_GUTTER)
    );
    maxHeight.value = Math.max(minHeight.value, minHeight.value * 2);

    if (width.value !== undefined) {
      width.value = clamp(width.value, minWidth.value, maxWidth.value);
    }

    if (height.value !== undefined) {
      height.value = clamp(height.value, minHeight.value, maxHeight.value);
    }
  };

  const measureCardSize = async () => {
    await nextTick();

    const element = cardElement.value;
    if (element === null) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    if (minWidth.value === 0) {
      minWidth.value = rect.width;
      width.value = rect.width;
    }

    if (toValue(expanded) && rect.height > minHeight.value) {
      minHeight.value = rect.height;
      height.value = Math.max(height.value ?? 0, rect.height);
    }

    updateResizeBounds();
  };

  const stopResize = () => {
    activeHandle.value = undefined;
    stopMove?.();
    stopUp?.();
    stopMove = undefined;
    stopUp = undefined;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const startResize = (handle: ResizeHandle, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (width.value === undefined || height.value === undefined) {
      return;
    }

    updateResizeBounds();
    activeHandle.value = handle;

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = width.value;
    const startHeight = height.value;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (handle === "top-left" || handle === "bottom-left") {
        width.value = clamp(
          startWidth - (moveEvent.clientX - startX),
          minWidth.value,
          maxWidth.value
        );
      }

      if (handle === "bottom-left" || handle === "bottom-right") {
        height.value = clamp(
          startHeight + (moveEvent.clientY - startY),
          minHeight.value,
          maxHeight.value
        );
      }
    };

    stopMove = useEventListener(document, "mousemove", onMouseMove);
    stopUp = useEventListener(document, "mouseup", stopResize);

    document.body.style.userSelect = "none";
    document.body.style.cursor = HANDLE_BODY_CURSOR[handle];
  };

  useEventListener(window, "resize", updateResizeBounds);

  watch(
    [cardElement, () => toValue(expanded)],
    async ([element, isExpanded]) => {
      if (element === null) {
        return;
      }

      if (!isExpanded && minWidth.value > 0) {
        updateResizeBounds();
        return;
      }

      await measureCardSize();
    },
    { immediate: true, flush: "post" }
  );

  onUnmounted(stopResize);

  return {
    activeHandle,
    cardStyle,
    resizeCursorClass,
    startResize,
  };
}
