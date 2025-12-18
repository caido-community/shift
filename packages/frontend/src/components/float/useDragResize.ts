import { useEventListener } from "@vueuse/core";
import { computed, ref } from "vue";

const WIDTH = 500;
const HEIGHT = 125;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export const useDragResize = (options: {
  initialTop: number;
  initialLeft: number;
}) => {
  const top = ref(options.initialTop);
  const left = ref(options.initialLeft);

  let stopMoveDrag: (() => void) | undefined = undefined;
  let stopUpDrag: (() => void) | undefined = undefined;
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const startTop = ref(0);
  const startLeft = ref(0);

  const onDragMouseMove = (event: MouseEvent) => {
    if (!isDragging.value) {
      return;
    }
    const deltaX = event.clientX - dragStartX.value;
    const deltaY = event.clientY - dragStartY.value;

    const maxLeft = window.innerWidth - WIDTH;
    const maxTop = window.innerHeight - HEIGHT;

    left.value = clamp(startLeft.value + deltaX, 0, maxLeft);
    top.value = clamp(startTop.value + deltaY, 0, maxTop);
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
    isDragging.value = true;
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
    startTop.value = top.value;
    startLeft.value = left.value;
    stopMoveDrag = useEventListener(document, "mousemove", onDragMouseMove);
    stopUpDrag = useEventListener(document, "mouseup", onDragMouseUp);
    event.preventDefault();
  };

  const style = computed(() => ({
    top: `${top.value}px`,
    left: `${left.value}px`,
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
  }));

  return {
    style,
    onDragMouseDown,
  };
};
