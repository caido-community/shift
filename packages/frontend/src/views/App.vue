<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";

import { LearningsContainer } from "@/components/learnings";
import { PromptsContainer } from "@/components/prompts";
import { RenamingContainer } from "@/components/renaming";
import { SettingsContainer } from "@/components/settings";
import { TutorialContainer } from "@/components/tutorial";

const page = ref<
  | "Custom Prompts"
  | "Learnings"
  | "AI Session Renaming"
  | "Settings"
  | "Tutorial"
>("Custom Prompts");
const items = [
  {
    label: "Custom Prompts",
    isActive: () => page.value === "Custom Prompts",
    onClick: () => {
      page.value = "Custom Prompts";
    },
  },
  {
    label: "Learnings",
    isActive: () => page.value === "Learnings",
    onClick: () => {
      page.value = "Learnings";
    },
  },
  {
    label: "AI Session Renaming",
    isActive: () => page.value === "AI Session Renaming",
    onClick: () => {
      page.value = "AI Session Renaming";
    },
  },
  {
    label: "Tutorial",
    isActive: () => page.value === "Tutorial",
    onClick: () => {
      page.value = "Tutorial";
    },
  },
  {
    label: "Settings",
    isActive: () => page.value === "Settings",
    onClick: () => {
      page.value = "Settings";
    },
  },
];

const component = computed(() => {
  switch (page.value) {
    case "Custom Prompts":
      return PromptsContainer;
    case "AI Session Renaming":
      return RenamingContainer;
    case "Learnings":
      return LearningsContainer;
    case "Settings":
      return SettingsContainer;
    case "Tutorial":
      return TutorialContainer;
    default:
      return PromptsContainer;
  }
});

// PrimeVue update broke types and we can't just do :label="item.label"
const handleLabel = (
  label: string | ((...args: unknown[]) => string) | undefined,
) => {
  if (typeof label === "function") {
    return label();
  }

  return label;
};
</script>

<template>
  <div class="flex flex-col h-full gap-1 overflow-hidden">
    <Card
      class="h-fit"
      :pt="{
        body: { class: 'h-fit p-0' },
        content: { class: 'h-fit flex flex-col' },
      }"
    >
      <template #content>
        <div class="flex justify-between items-center p-4">
          <div>
            <h3 class="text-lg font-semibold">Shift Agents</h3>
            <p class="text-sm text-surface-300">
              Shift Agents is a tool that allows you to delegate replay sessions
              into agent hands
            </p>
          </div>
        </div>
      </template>
    </Card>

    <MenuBar :model="items" class="h-12 gap-2">
      <template #item="{ item }">
        <Button
          :severity="item.isActive() ? 'secondary' : 'contrast'"
          :outlined="item.isActive()"
          size="small"
          :text="!item.isActive()"
          :label="handleLabel(item.label)"
          @mousedown="item.onClick()"
        />
      </template>
    </MenuBar>

    <Card
      class="h-full"
      :pt="{
        body: { class: 'h-full p-0' },
        content: { class: 'h-fit flex flex-col h-full gap-1 overflow-hidden' },
      }"
    >
      <template #content>
        <component :is="component" />
      </template>
    </Card>
  </div>
</template>
