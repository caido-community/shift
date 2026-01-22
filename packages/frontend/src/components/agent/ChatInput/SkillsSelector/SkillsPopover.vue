<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Popover from "primevue/popover";
import { ref } from "vue";

import { useSelector } from "./useSelector";

const { skillOptions, isSelected, toggleSkill } = useSelector();

const popoverRef = ref<InstanceType<typeof Popover>>();
const onToggle = (event: MouseEvent) => {
  popoverRef.value?.toggle(event);
};
</script>

<template>
  <div class="relative flex items-center">
    <Button
      severity="tertiary"
      icon="fas fa-plus"
      :pt:root="{
        class:
          'bg-surface-700/50 text-surface-200 text-sm py-1.5 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 h-8 w-8 cursor-pointer',
      }"
      @click="onToggle" />

    <Popover
      id="skills-selector-popover"
      ref="popoverRef"
      position="top"
      :pt:root="{
        class: 'bg-surface-800 border border-surface-700 rounded-md shadow-lg !z-[1202]',
      }"
      :pt:content="{ class: 'p-1 rounded-md' }">
      <div class="flex flex-col gap-1.5 w-fit min-w-[200px]">
        <div class="max-h-64 overflow-y-auto">
          <div
            v-for="skill in skillOptions"
            :key="skill.id"
            class="flex items-center gap-2 py-1 px-1.5 hover:bg-surface-700/40 rounded cursor-pointer"
            @click="toggleSkill(skill.id)">
            <Checkbox
              :model-value="isSelected(skill.id)"
              binary
              size="small"
              @click.stop
              @update:model-value="toggleSkill(skill.id)" />
            <span class="text-surface-200 text-sm font-mono truncate flex-1">
              {{ skill.title }}
            </span>
          </div>
          <div
            v-if="skillOptions.length === 0"
            class="text-surface-400 text-xs p-2">
            No skills available
          </div>
        </div>
      </div>
    </Popover>
  </div>
</template>
