import { useEventListener } from "@vueuse/core";
import {
  computed,
  type MaybeRefOrGetter,
  nextTick,
  ref,
  toValue,
  useTemplateRef,
  watch,
} from "vue";

import { useMouseDrag } from "@/utils/useMouseDrag";

const VIEWPORT_GUTTER = 32;
const EXPANDED_MAX_HEIGHT_RATIO = 0.55;
const EXPANDED_MAX_HEIGHT_PX = 250;

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
  const drag = useMouseDrag();
  const lastHandle = ref<ResizeHandle>();
  const activeHandle = computed(() => (drag.isDragging.value ? lastHandle.value : undefined));

  const getExpandedMaxHeight = (rect?: DOMRect) => {
    const viewportCap = Math.min(
      window.innerHeight * EXPANDED_MAX_HEIGHT_RATIO,
      EXPANDED_MAX_HEIGHT_PX
    );
    const availableHeight =
      rect === undefined
        ? viewportCap
        : Math.max(0, window.innerHeight - rect.top - VIEWPORT_GUTTER);

    return Math.min(viewportCap, availableHeight);
  };

  const cardStyle = computed(() => ({
    width: width.value === undefined ? undefined : `${width.value}px`,
    height: toValue(expanded) && height.value !== undefined ? `${height.value}px` : undefined,
    maxHeight: toValue(expanded) && maxHeight.value > 0 ? `${maxHeight.value}px` : undefined,
  }));

  const resizeCursorClass = computed(() =>
    activeHandle.value === undefined ? undefined : HANDLE_CURSOR_CLASS[activeHandle.value]
  );

  const getCardRect = () => {
    const element = cardElement.value;
    if (element === null) {
      return undefined;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }

    return rect;
  };

  const updateResizeBounds = () => {
    const rect = getCardRect();

    maxWidth.value = Math.max(
      minWidth.value,
      Math.min(minWidth.value * 2, window.innerWidth - VIEWPORT_GUTTER)
    );
    maxHeight.value = getExpandedMaxHeight(rect);

    if (width.value !== undefined) {
      width.value = clamp(width.value, minWidth.value, maxWidth.value);
    }

    if (height.value !== undefined && maxHeight.value > 0) {
      height.value = clamp(height.value, minHeight.value, maxHeight.value);
    }
  };

  const measureCardSize = async () => {
    await nextTick();

    const rect = getCardRect();
    if (rect === undefined) {
      return;
    }

    if (minWidth.value === 0) {
      minWidth.value = rect.width;
      width.value = rect.width;
    }

    if (toValue(expanded)) {
      const measuredMaxHeight = getExpandedMaxHeight(rect);
      maxHeight.value = measuredMaxHeight;

      if (minHeight.value === 0) {
        minHeight.value = Math.min(rect.height, measuredMaxHeight);
      }

      if (height.value !== undefined && measuredMaxHeight > 0) {
        height.value = clamp(height.value, minHeight.value, measuredMaxHeight);
      }
    }

    updateResizeBounds();
  };

  const startResize = (handle: ResizeHandle, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = getCardRect();
    if (rect === undefined) {
      return;
    }

    minWidth.value = Math.max(minWidth.value, rect.width);
    width.value ??= rect.width;

    if (toValue(expanded)) {
      if (minHeight.value === 0) {
        minHeight.value = Math.min(rect.height, getExpandedMaxHeight(rect));
      }
      if (handle !== "top-left") {
        height.value ??= Math.min(rect.height, getExpandedMaxHeight(rect));
      }
    }

    updateResizeBounds();
    lastHandle.value = handle;

    const startWidth = width.value;
    const startHeight = height.value ?? rect.height;

    drag.start(
      event,
      (deltaX, deltaY) => {
        if (handle === "top-left" || handle === "bottom-left") {
          width.value = clamp(startWidth - deltaX, minWidth.value, maxWidth.value);
        }
        if (handle === "bottom-left" || handle === "bottom-right") {
          height.value = clamp(startHeight + deltaY, minHeight.value, maxHeight.value);
        }
      },
      HANDLE_BODY_CURSOR[handle]
    );
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

  return {
    activeHandle,
    cardStyle,
    resizeCursorClass,
    startResize,
  };
}
