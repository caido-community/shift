import { tryOnScopeDispose, useEventListener } from "@vueuse/core";
import { ref } from "vue";

type OnMove = (deltaX: number, deltaY: number) => void;

export const useMouseDrag = () => {
  const isDragging = ref(false);
  let stopListeners: (() => void) | undefined;

  const stop = () => {
    stopListeners?.();
    stopListeners = undefined;
    isDragging.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const start = (event: MouseEvent, onMove: OnMove, cursor = "") => {
    event.preventDefault();
    stop();

    const { clientX: startX, clientY: startY } = event;
    const stopMove = useEventListener(document, "mousemove", (e: MouseEvent) =>
      onMove(e.clientX - startX, e.clientY - startY)
    );
    const stopUp = useEventListener(document, "mouseup", stop);
    stopListeners = () => {
      stopMove();
      stopUp();
    };

    isDragging.value = true;
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
  };

  tryOnScopeDispose(stop);

  return { isDragging, start, stop };
};
