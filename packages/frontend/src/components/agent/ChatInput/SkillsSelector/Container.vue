<script setup lang="ts">
import Button from "primevue/button";
import { onBeforeUnmount, onMounted } from "vue";

import SkillsPopover from "./SkillsPopover.vue";
import { useSelector } from "./useSelector";

const {
  selectedSkills,
  showLeft,
  showRight,
  scrollLeftBy,
  scrollRightBy,
  bindScrollHandlers,
  unbindScrollHandlers,
  listRef,
} = useSelector();

defineExpose({ listRef });

onMounted(() => bindScrollHandlers());
onBeforeUnmount(() => unbindScrollHandlers());
</script>

<template>
  <div class="relative flex items-center gap-2 min-w-0 shrink">
    <div class="relative w-64 overflow-hidden">
      <div
        ref="listRef"
        class="flex items-center gap-2 overflow-x-auto flex-nowrap w-full relative z-10 min-h-6"
        style="scrollbar-width: none; -ms-overflow-style: none">
        <div
          class="flex-1 min-w-0 shrink"
          aria-hidden="true" />
        <div
          v-for="skill in selectedSkills"
          :key="skill.id"
          class="relative shrink-0">
          <div
            class="px-2 py-1 rounded border border-dotted border-surface-600 text-surface-300 text-xs font-mono cursor-default hover:border-surface-500 whitespace-nowrap">
            {{ skill.title }}
          </div>
        </div>
      </div>

      <Button
        v-if="showLeft"
        severity="tertiary"
        icon="fas fa-angle-left"
        :pt:root="{
          class:
            'absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface-700/80 text-surface-300 hover:text-white hover:bg-surface-700/90 shadow z-30',
        }"
        @click="scrollLeftBy" />
      <Button
        v-if="showRight"
        severity="tertiary"
        icon="fas fa-angle-right"
        :pt:root="{
          class:
            'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface-700/80 text-surface-300 hover:text-white hover:bg-surface-700/90 shadow z-30',
        }"
        @click="scrollRightBy" />
    </div>
    <SkillsPopover />
  </div>
</template>
