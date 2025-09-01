import { useEventListener } from "@vueuse/core";
import { computed, ref } from "vue";

export const useDragResize = (options: {
  initialTop: number;
  initialLeft: number;
}) => {
  const width = ref(500);
  const height = ref(125);
  const top = ref(options.initialTop);
  const left = ref(options.initialLeft);

  let stopMove: (() => void) | undefined = undefined;
  let stopUp: (() => void) | undefined = undefined;
  const isResizing = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const startWidth = ref(0);
  const startHeight = ref(0);

  let stopMoveDrag: (() => void) | undefined = undefined;
  let stopUpDrag: (() => void) | undefined = undefined;
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const startTop = ref(0);
  const startLeft = ref(0);

  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing.value) {
      return;
    }
    const deltaX = event.clientX - startX.value;
    const deltaY = event.clientY - startY.value;
    const nextWidth = startWidth.value + deltaX;
    const nextHeight = startHeight.value + deltaY;
    width.value = nextWidth > 300 ? nextWidth : 300;
    height.value = nextHeight > 120 ? nextHeight : 120;
  };

  const onMouseUp = () => {
    if (!isResizing.value) {
      return;
    }
    isResizing.value = false;
    if (stopMove !== undefined) {
      stopMove();
      stopMove = undefined;
    }
    if (stopUp !== undefined) {
      stopUp();
      stopUp = undefined;
    }
  };

  const onResizeMouseDown = (event: MouseEvent) => {
    isResizing.value = true;
    startX.value = event.clientX;
    startY.value = event.clientY;
    startWidth.value = width.value;
    startHeight.value = height.value;
    stopMove = useEventListener(document, "mousemove", onMouseMove);
    stopUp = useEventListener(document, "mouseup", onMouseUp);
    event.preventDefault();
  };

  const onDragMouseMove = (event: MouseEvent) => {
    if (!isDragging.value) {
      return;
    }
    const deltaX = event.clientX - dragStartX.value;
    const deltaY = event.clientY - dragStartY.value;
    left.value = startLeft.value + deltaX;
    top.value = startTop.value + deltaY;
  };

  const onDragMouseUp = () => {
    if (!isDragging.value) {
      return;
    }
    isDragging.value = false;
    if (stopMoveDrag !== undefined) {
      stopMoveDrag();
      stopMoveDrag = undefined;
    }
    if (stopUpDrag !== undefined) {
      stopUpDrag();
      stopUpDrag = undefined;
    }
  };

  const onDragMouseDown = (event: MouseEvent) => {
    if (isResizing.value) {
      return;
    }
    isDragging.value = true;
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
    startTop.value = top.value;
    startLeft.value = left.value;
    stopMoveDrag = useEventListener(document, "mousemove", onDragMouseMove);
    stopUpDrag = useEventListener(document, "mouseup", onDragMouseUp);
    event.preventDefault();
  };

  const style = computed(() => {
    return {
      top: `${top.value}px`,
      left: `${left.value}px`,
      width: `${width.value}px`,
      height: `${height.value}px`,
    };
  });

  return {
    style,
    onResizeMouseDown,
    onDragMouseDown,
  };
};
