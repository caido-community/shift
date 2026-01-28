import { useEventListener } from "@vueuse/core";
import { computed, ref, type Ref } from "vue";

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 125;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 100;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export const useFloat = (
  target: Ref<HTMLElement | undefined>,
  options: { initialTop: number; initialLeft: number }
) => {
  const top = ref(options.initialTop);
  const left = ref(options.initialLeft);
  const width = ref(DEFAULT_WIDTH);
  const height = ref(DEFAULT_HEIGHT);

  // Drag state
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const startTop = ref(0);
  const startLeft = ref(0);

  let stopMoveDrag: (() => void) | undefined;
  let stopUpDrag: (() => void) | undefined;

  const onDragMouseMove = (event: MouseEvent) => {
    if (!isDragging.value) return;

    const deltaX = event.clientX - dragStartX.value;
    const deltaY = event.clientY - dragStartY.value;

    const maxLeft = window.innerWidth - width.value;
    const maxTop = window.innerHeight - height.value;

    left.value = clamp(startLeft.value + deltaX, 0, maxLeft);
    top.value = clamp(startTop.value + deltaY, 0, maxTop);
  };

  const onDragMouseUp = () => {
    if (!isDragging.value) return;

    isDragging.value = false;
    stopMoveDrag?.();
    stopUpDrag?.();
    stopMoveDrag = undefined;
    stopUpDrag = undefined;
  };

  const onDragMouseDown = (event: MouseEvent) => {
    isDragging.value = true;
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
    startTop.value = top.value;
    startLeft.value = left.value;

    stopMoveDrag = useEventListener(document, "mousemove", onDragMouseMove);
    stopUpDrag = useEventListener(document, "mouseup", onDragMouseUp);

    event.preventDefault();
  };

  // Resize state
  const isResizing = ref(false);
  const resizeStartX = ref(0);
  const resizeStartY = ref(0);
  const startWidth = ref(0);
  const startHeight = ref(0);

  let stopMoveResize: (() => void) | undefined;
  let stopUpResize: (() => void) | undefined;

  const onResizeMouseMove = (event: MouseEvent) => {
    if (!isResizing.value) return;

    const deltaX = event.clientX - resizeStartX.value;
    const deltaY = event.clientY - resizeStartY.value;

    const maxWidth = window.innerWidth - left.value;
    const maxHeight = window.innerHeight - top.value;

    width.value = clamp(startWidth.value + deltaX, MIN_WIDTH, maxWidth);
    height.value = clamp(startHeight.value + deltaY, MIN_HEIGHT, maxHeight);
  };

  const onResizeMouseUp = () => {
    if (!isResizing.value) return;

    isResizing.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    stopMoveResize?.();
    stopUpResize?.();
    stopMoveResize = undefined;
    stopUpResize = undefined;
  };

  const onResizeMouseDown = (event: MouseEvent) => {
    isResizing.value = true;
    resizeStartX.value = event.clientX;
    resizeStartY.value = event.clientY;
    startWidth.value = width.value;
    startHeight.value = height.value;

    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";

    stopMoveResize = useEventListener(document, "mousemove", onResizeMouseMove);
    stopUpResize = useEventListener(document, "mouseup", onResizeMouseUp);

    event.preventDefault();
    event.stopPropagation();
  };

  const style = computed(() => ({
    top: `${top.value}px`,
    left: `${left.value}px`,
    width: `${width.value}px`,
    height: `${height.value}px`,
  }));

  return {
    style,
    isDragging,
    isResizing,
    onDragMouseDown,
    onResizeMouseDown,
  };
};
