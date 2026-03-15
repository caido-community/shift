<script setup lang="ts">
import Button from "primevue/button";
import MenuBar from "primevue/menubar";
import { type LegacyCollectionAutoRunMigrationSummary } from "shared";
import { computed, ref, watch } from "vue";

import { CustomAgentsContainer } from "@/components/custom-agents";
import { LearningsContainer } from "@/components/learnings";
import { LegacyCollectionAutoRunDialog } from "@/components/migration";
import { ModelsContainer } from "@/components/models";
import { RenamingContainer } from "@/components/renaming";
import { SettingsContainer } from "@/components/settings";
import { SkillsContainer } from "@/components/skills";
import { TutorialContainer } from "@/components/tutorial";
import { useSDK } from "@/plugins/sdk";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";

type Page =
  | "Agents"
  | "Skills"
  | "Models"
  | "Learnings"
  | "Session Renaming"
  | "Settings"
  | "Tutorial";

const sdk = useSDK();
const settingsStore = useSettingsStore();
const skillsStore = useSkillsStore();

const page = ref<Page>("Agents");
const isMigrationDialogVisible = ref(false);
const hasRequestedMigrationSummary = ref(false);
const migrationSummary = ref<LegacyCollectionAutoRunMigrationSummary | undefined>(undefined);

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

watch(
  () => [settingsStore.isLoading, skillsStore.isLoading, settingsStore.config] as const,
  async ([settingsLoading, skillsLoading, config]) => {
    if (
      hasRequestedMigrationSummary.value ||
      settingsLoading ||
      skillsLoading ||
      config === undefined
    ) {
      return;
    }

    hasRequestedMigrationSummary.value = true;

    const result = await sdk.backend.getLegacyCollectionAutoRunMigrationSummary();
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }

    migrationSummary.value = result.value;
    if (result.value.affected) {
      isMigrationDialogVisible.value = true;
    }
  },
  { immediate: true }
);

function dismissMigrationNotice() {
  isMigrationDialogVisible.value = false;
}

function openAgentsFromMigrationNotice() {
  page.value = "Agents";
  dismissMigrationNotice();
}
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

    <LegacyCollectionAutoRunDialog
      v-if="migrationSummary !== undefined"
      v-model:visible="isMigrationDialogVisible"
      :summary="migrationSummary"
      @dismiss="dismissMigrationNotice"
      @open-agents="openAgentsFromMigrationNotice" />
  </div>
</template>
