import { ref } from "vue";

import { useMouseDrag } from "@/utils/useMouseDrag";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 500;

export function useResize(initialHeight = 208) {
  const height = ref(initialHeight);
  const drag = useMouseDrag();

  function startResize(event: MouseEvent) {
    const startHeight = height.value;
    drag.start(event, (_, deltaY) => {
      height.value = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight - deltaY));
    });
  }

  return { height, startResize };
}
