<script setup lang="ts">
import { computed, useSlots, type VNode } from "vue";

const { duration = 0.7, spread = 2 } = defineProps<{
  duration?: number;
  spread?: number;
}>();

const slots = useSlots();

const extractText = (nodes: VNode[]): string => {
  let text = "";
  for (const node of nodes) {
    if (typeof node.children === "string") {
      text += node.children;
    } else if (Array.isArray(node.children)) {
      text += extractText(node.children as VNode[]);
    }
  }
  return text;
};

const slotText = computed(() => {
  const defaultSlot = slots.default?.();
  if (!defaultSlot || defaultSlot.length === 0) return "";
  return extractText(defaultSlot);
});

const dynamicSpread = computed(() => {
  return slotText.value.length * spread;
});

const shimmerStyle = computed(() => ({
  "--spread": `${dynamicSpread.value}px`,
  "--duration": `${duration}s`,
  backgroundImage: `var(--bg), linear-gradient(#acacac, #acacac)`,
}));
</script>

<template>
  <span
    class="relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),#ffffff,#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box] animate-shimmer"
    :style="shimmerStyle">
    <slot />
  </span>
</template>

<style scoped>
@keyframes shimmer {
  from {
    background-position: 150% center;
  }
  to {
    background-position: -50% center;
  }
}

.animate-shimmer {
  animation: shimmer var(--duration) linear infinite;
}
</style>
