<script setup lang="ts">
import Button from "primevue/button";
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";

import { CustomAgentsContainer } from "@/components/custom-agents";
import { LearningsContainer } from "@/components/learnings";
import { ModelsContainer } from "@/components/models";
import { RenamingContainer } from "@/components/renaming";
import { SettingsContainer } from "@/components/settings";
import { SkillsContainer } from "@/components/skills";
import { TutorialContainer } from "@/components/tutorial";

const page = ref<
  "Agents" | "Skills" | "Models" | "Learnings" | "Session Renaming" | "Settings" | "Tutorial"
>("Agents");

const items = [
  {
    label: "Agents",
    isActive: () => page.value === "Agents",
    command: () => {
      page.value = "Agents";
    },
  },
  {
    label: "Models",
    isActive: () => page.value === "Models",
    command: () => {
      page.value = "Models";
    },
  },
  {
    label: "Skills",
    isActive: () => page.value === "Skills",
    command: () => {
      page.value = "Skills";
    },
  },
  {
    label: "Learnings",
    isActive: () => page.value === "Learnings",
    command: () => {
      page.value = "Learnings";
    },
  },
  {
    label: "Session Renaming",
    isActive: () => page.value === "Session Renaming",
    command: () => {
      page.value = "Session Renaming";
    },
  },
  {
    label: "Tutorial",
    isActive: () => page.value === "Tutorial",
    command: () => {
      page.value = "Tutorial";
    },
  },
  {
    label: "Settings",
    isActive: () => page.value === "Settings",
    command: () => {
      page.value = "Settings";
    },
  },
];

const component = computed(() => {
  switch (page.value) {
    case "Agents":
      return CustomAgentsContainer;
    case "Skills":
      return SkillsContainer;
    case "Models":
      return ModelsContainer;
    case "Session Renaming":
      return RenamingContainer;
    case "Learnings":
      return LearningsContainer;
    case "Settings":
      return SettingsContainer;
    case "Tutorial":
      return TutorialContainer;
    default:
      return CustomAgentsContainer;
  }
});

// PrimeVue update broke types and we can't just do :label="item.label"
const handleLabel = (label: string | ((...args: unknown[]) => string) | undefined) => {
  if (typeof label === "function") {
    return label();
  }

  return label;
};
</script>

<template>
  <div class="flex flex-col h-full gap-1 overflow-hidden">
    <MenuBar
      :model="items"
      class="h-12 gap-2">
      <template #start>
        <div class="px-2 font-bold">Shift Agents</div>
      </template>

      <template #item="{ item }">
        <Button
          :severity="item.isActive?.() ? 'secondary' : 'contrast'"
          :outlined="item.isActive?.()"
          size="small"
          :text="!item.isActive?.()"
          :label="handleLabel(item.label)"
          @mousedown="item.command?.()" />
      </template>
    </MenuBar>

    <component
      :is="component"
      class="h-full min-h-0" />
  </div>
</template>
