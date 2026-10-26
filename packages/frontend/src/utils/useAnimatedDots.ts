import { computed, type MaybeRefOrGetter, ref, toValue, watchEffect } from "vue";

export const useAnimatedDots = (
  baseText: MaybeRefOrGetter<string>,
  isActive: MaybeRefOrGetter<boolean>,
  interval = 200
) => {
  const dotCount = ref(1);

  watchEffect((onCleanup) => {
    if (!toValue(isActive)) {
      dotCount.value = 1;
      return;
    }

    const timer = setInterval(() => {
      dotCount.value = (dotCount.value % 3) + 1;
    }, interval);
    onCleanup(() => clearInterval(timer));
  });

  return computed(() => `${toValue(baseText)}${".".repeat(dotCount.value)}`);
};
