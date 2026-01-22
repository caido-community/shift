import { useEventListener } from "@vueuse/core";
import { ref } from "vue";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 500;

export function useResize(initialHeight = 208) {
  const height = ref(initialHeight);

  function startResize(event: MouseEvent) {
    const startY = event.clientY;
    const startHeight = height.value;

    const cleanupMove = useEventListener(document, "mousemove", (e: MouseEvent) => {
      const delta = startY - e.clientY;
      height.value = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta));
    });

    const cleanupUp = useEventListener(document, "mouseup", () => {
      cleanupMove();
      cleanupUp();
    });
  }

  return { height, startResize };
}
