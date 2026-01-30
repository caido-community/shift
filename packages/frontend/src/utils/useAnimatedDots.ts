import { computed, type MaybeRefOrGetter, onUnmounted, ref, toValue, watchEffect } from "vue";

export const useAnimatedDots = (
  baseText: string,
  isActive: MaybeRefOrGetter<boolean>,
  interval = 200
) => {
  const dotCount = ref(1);
  let dotInterval: ReturnType<typeof setInterval> | undefined;

  const text = computed(() => `${baseText}${".".repeat(dotCount.value)}`);

  watchEffect((onCleanup) => {
    if (toValue(isActive)) {
      dotInterval = setInterval(() => {
        dotCount.value = (dotCount.value % 3) + 1;
      }, interval);
    } else {
      if (dotInterval !== undefined) {
        clearInterval(dotInterval);
        dotInterval = undefined;
      }
      dotCount.value = 1;
    }

    onCleanup(() => {
      if (dotInterval !== undefined) {
        clearInterval(dotInterval);
        dotInterval = undefined;
      }
    });
  });

  onUnmounted(() => {
    if (dotInterval !== undefined) {
      clearInterval(dotInterval);
    }
  });

  return text;
};
