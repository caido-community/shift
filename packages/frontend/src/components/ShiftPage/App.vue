<script setup lang="ts">
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";
import { onMounted } from "vue";
import type { Caido } from "@caido/sdk-frontend";
import Tutorial from "./Tutorial.vue";
import Settings from "./Settings.vue";
import { getPluginStorage } from "../../utils/caidoUtils";

// Define props
const props = defineProps<{
  caido: Caido;
  apiEndpoint: string;
  startRenameInterval: () => void;
  updateMemory: boolean;
}>();

const page = ref<"Settings" | "Tutorial">("Settings");
const items = [
  {
    label: "Settings",
    command: () => {
      page.value = "Settings";
    },
  },
  {
    label: "Tutorial",
    command: () => {
      page.value = "Tutorial";
    },
  },
];

const component = computed(() => {
  switch (page.value) {
    case "Settings":
      return Settings;
    case "Tutorial":
      return Tutorial;
  }
});

onMounted(async () => {
  // Check if user has seen tutorial
  const storage = await getPluginStorage(props.caido);
  if (!storage.hasSeenTutorial) {
    page.value = "Tutorial";
  }
});
</script>

<template>
  <div id="plugin--shift">
    <div class="h-full flex flex-col gap-1">
      <div class="flex items-center w-full" style="background-color: var(--p-menubar-background); border: 1px solid var(--c-bg-tertiary); border-radius: var(--p-menubar-border-radius);">
        <div class="flex items-center gap-2 px-2" style="font-size: 2em;">
          <i class="far fa-arrow-alt-circle-up"></i>
          <span class="font-bold">Shift</span>
        </div>
        <MenuBar :model="items" breakpoint="320px" class="flex-1" />
      </div>
      <div class="flex-1 min-h-0">
        <component 
          :is="component" 
          :caido="caido"
          :apiEndpoint="apiEndpoint"
          :startRenameInterval="startRenameInterval"
          :updateMemory="updateMemory"
        />
      </div>
    </div>
  </div>
</template>

<style>
#plugin--shift {
  height: 100%;
}
:root {
  --p-menubar-padding: .5em;
  --p-menubar-background: #30333b;
  --p-menubar-border-radius: 5px;
}
</style>