import { computed, ref } from "vue";

import { useMouseDrag } from "@/utils/useMouseDrag";

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 125;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 100;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export const useFloat = (options: { initialTop: number; initialLeft: number }) => {
  const top = ref(options.initialTop);
  const left = ref(options.initialLeft);
  const width = ref(DEFAULT_WIDTH);
  const height = ref(DEFAULT_HEIGHT);

  const drag = useMouseDrag();
  const resize = useMouseDrag();

  const onDragMouseDown = (event: MouseEvent) => {
    const startTop = top.value;
    const startLeft = left.value;
    drag.start(event, (deltaX, deltaY) => {
      left.value = clamp(startLeft + deltaX, 0, window.innerWidth - width.value);
      top.value = clamp(startTop + deltaY, 0, window.innerHeight - height.value);
    });
  };

  const onResizeMouseDown = (event: MouseEvent) => {
    event.stopPropagation();
    const startWidth = width.value;
    const startHeight = height.value;
    resize.start(
      event,
      (deltaX, deltaY) => {
        width.value = clamp(startWidth + deltaX, MIN_WIDTH, window.innerWidth - left.value);
        height.value = clamp(startHeight + deltaY, MIN_HEIGHT, window.innerHeight - top.value);
      },
      "nwse-resize"
    );
  };

  const style = computed(() => ({
    top: `${top.value}px`,
    left: `${left.value}px`,
    width: `${width.value}px`,
    height: `${height.value}px`,
  }));

  return {
    style,
    isResizing: resize.isDragging,
    onDragMouseDown,
    onResizeMouseDown,
  };
};
