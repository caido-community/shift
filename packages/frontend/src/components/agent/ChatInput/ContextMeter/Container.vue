<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, ref, useTemplateRef } from "vue";

import { useSession } from "../../useSession";
import { hint } from "../ModelSelector/tooltip";

import { type ContextSegment, formatTokens, getCacheHitRate } from "@/agent/utils/contextUsage";

const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SEGMENT_CLASSES: Record<ContextSegment["kind"], string> = {
  system: "bg-orange-400",
  tools: "bg-emerald-500",
  skills: "bg-violet-400",
  turn: "bg-surface-500",
  latest: "bg-blue-400",
};

const session = useSession();
const usage = computed(() => session.estimateContextUsage());
const cacheHitRate = computed(() => getCacheHitRate(session.chat.messages));
const percentage = computed(() => Math.min(100, Math.max(0, Math.round(usage.value.percentage))));
const freeTokens = computed(() =>
  Math.max(0, usage.value.availableTokens - usage.value.usedTokens)
);
const reservedTokens = computed(
  () => usage.value.contextWindowTokens - usage.value.availableTokens
);

const levelClass = computed(() => {
  if (percentage.value >= 90) return "text-red-400";
  if (percentage.value >= 70) return "text-yellow-400";
  return "";
});

const hovered = ref(false);
const pinned = ref(false);
const open = computed(() => hovered.value || pinned.value);

const root = useTemplateRef("root");
onClickOutside(root, () => {
  pinned.value = false;
});
</script>

<template>
  <div
    ref="root"
    class="relative"
    @mouseleave="hovered = false">
    <button
      type="button"
      class="flex items-center gap-1.5 h-8 px-2 rounded-md text-xs tabular-nums cursor-pointer transition-colors"
      :class="
        open ? 'bg-surface-700/50 text-surface-200' : 'text-surface-400 hover:text-surface-200'
      "
      @mouseenter="hovered = true"
      @click="pinned = !pinned">
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        class="-rotate-90"
        :class="levelClass">
        <circle
          cx="8"
          cy="8"
          :r="RING_RADIUS"
          fill="none"
          stroke-width="2"
          class="stroke-surface-600" />
        <circle
          cx="8"
          cy="8"
          :r="RING_RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          :stroke-dasharray="`${(percentage / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`" />
      </svg>
      {{ percentage }}%
    </button>

    <div
      v-if="open"
      class="absolute bottom-full right-0 pb-2 z-50">
      <div
        class="w-[min(24rem,calc(100vw-2rem))] bg-surface-900 border border-surface-700 rounded-xl shadow-2xl px-4 py-3.5">
        <div class="flex items-center justify-between text-sm leading-4">
          <span class="font-medium text-surface-200">Context window</span>
          <span class="text-surface-300 tabular-nums">{{ percentage }}% full</span>
        </div>

        <div class="flex items-center gap-0.5 h-5 mt-2 overflow-hidden">
          <div
            v-for="(segment, index) in usage.segments"
            :key="index"
            v-tooltip.top="hint(segment.label, `${formatTokens(segment.tokens)} tokens`)"
            class="h-3 rounded-sm transition-transform duration-100 hover:scale-y-150 hover:brightness-150"
            :class="[
              SEGMENT_CLASSES[segment.kind],
              segment.kind === 'turn' || segment.kind === 'latest' ? 'min-w-1.5' : 'min-w-3',
            ]"
            :style="{ flex: `${segment.tokens} 1 0` }" />
          <div
            v-if="freeTokens > 0"
            v-tooltip.top="hint('Free', `${formatTokens(freeTokens)} tokens`)"
            class="h-3 min-w-1 rounded-sm bg-surface-700"
            :style="{ flex: `${freeTokens} 1 0` }" />
          <div
            v-tooltip.top="
              hint(
                'Reserved',
                `${formatTokens(reservedTokens)} tokens kept free. Shift compacts the conversation before using them`
              )
            "
            class="h-3 min-w-1 rounded-sm border-l border-dashed border-surface-400 bg-surface-800"
            :style="{ flex: `${reservedTokens} 1 0` }" />
        </div>

        <div class="flex justify-between mt-2.5 text-xs text-surface-400 tabular-nums">
          <span>
            {{ formatTokens(usage.usedTokens) }} of {{ formatTokens(usage.availableTokens) }} tokens
          </span>
          <span v-if="cacheHitRate !== undefined">{{ Math.round(cacheHitRate) }}% cache hit</span>
        </div>
      </div>
    </div>
  </div>
</template>
