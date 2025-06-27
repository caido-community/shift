<script setup lang="ts">
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";
import { onMounted, onUnmounted } from "vue";
import type { FrontendSDK } from "@/types";
import Tutorial from "./Tutorial.vue";
import Settings from "./Settings.vue";
import Agents from "./Agents.vue";
import Welcome from "./Welcome.vue";
import { getPluginStorage } from "../../utils/caidoUtils";
import { startToolbarObserver, stopToolbarObserver} from "../../utils/toolbarInjection";

// Define props
const props = defineProps<{
  caido: FrontendSDK;
  apiEndpoint: string;
  startRenameInterval: () => void;
  updateMemory: boolean;
}>();

const page = ref<"Settings" | "Tutorial" | "Agents">("Settings");
const isAuthenticated = ref(false);
let authCheckInterval: number | null = null;

// Create a computed property for menu items that updates when page changes
const items = computed(() => [
  {
    label: "Settings",
    command: () => {
      page.value = "Settings";
    },
    class: page.value === "Settings" ? "active-nav-item" : ""
  },/*
  {
    label: "Agents",
    command: () => {
      page.value = "Agents";
    },
    class: page.value === "Agents" ? "active-nav-item" : ""
  }*/
  {
    label: "Tutorial",
    command: () => {
      page.value = "Tutorial";
    },
    class: page.value === "Tutorial" ? "active-nav-item" : ""
  },
]);


const component = computed(() => {
  switch (page.value) {
    case "Settings":
      return Settings;
    case "Tutorial":
      return Tutorial;
    case "Agents":
      return Agents;
  }
});

onMounted(async () => {
  // Check if user has seen tutorial
  const storage = await getPluginStorage(props.caido);
  if (!storage.apiKey && !storage.hasSeenTutorial) {
    page.value = "Settings";
  } else if (!storage.hasSeenTutorial) {
    page.value = "Tutorial";
  }

  if (storage.apiKey) {
    isAuthenticated.value = true;
    checkAuthentication();
    startAuthCheck();
  }

  // Add class to parent element
  const pluginElement = document.getElementById('plugin--shift');
  if (pluginElement && pluginElement.parentElement) {
    pluginElement.parentElement.classList.add('shift-parent');
  }

  // Start the toolbar observer to inject our component
  //feature flag
  if (window.name.includes("dev")) {
    startToolbarObserver(props.caido, props.apiEndpoint);
  }

});

// Clean up when component is unmounted
onUnmounted(() => {
  // Stop the toolbar observer and remove any injected components
  //feature flag
  if (window.name.includes("dev")) {
    stopToolbarObserver();
  }

  stopAuthCheck();
});

const checkAuthentication = async () => {
  const auth = JSON.parse(localStorage.getItem("CAIDO_AUTHENTICATION") || "{}");
  const accessToken = auth.accessToken;

  if (!accessToken) {
    isAuthenticated.value = false;
    return;
  }

  try {
    const response = await props.caido.backend.authenticate(accessToken);
    if (response.kind === "Error") {
      isAuthenticated.value = false;
    }
  } catch (error) {
    isAuthenticated.value = false;
  }
};

const startAuthCheck = () => {
  if (authCheckInterval) {
    return;
  }

  authCheckInterval = window.setInterval(checkAuthentication, 3 * 60 * 60 * 1000);
};

const stopAuthCheck = () => {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
};

// Add handler function
const handleAuthenticated = async () => {
  const storage = await getPluginStorage(props.caido);
  if (!storage.hasSeenTutorial) {
    page.value = "Tutorial";
  }
  startAuthCheck();
};
</script>

<template>
  <div id="plugin--shift">
    <Welcome :caido="caido" :isAuthenticated="isAuthenticated" @authenticated="() => { isAuthenticated = true; startAuthCheck(); }" v-if="!isAuthenticated" />
    <div v-else class="h-full flex flex-col gap-1">
      <div class="navbar flex items-center w-full">
        <div class="logo flex items-center gap-2 px-2">
          <i class="far fa-arrow-alt-circle-up"></i>
          <span class="font-bold">Shift</span>
        </div>
        <MenuBar :model="items" breakpoint="320px" class="flex-1" />
      </div>
      <div class="bodycard flex-1 min-h-0">
        <component
          :is="component"
          :caido="caido"
          :apiEndpoint="apiEndpoint"
          :startRenameInterval="startRenameInterval"
          :updateMemory="updateMemory"
          @authenticated="handleAuthenticated"
        />
      </div>
    </div>
  </div>
</template>

<style>
/* Style for the parent element */
.shift-parent {
  height: 100%;
}

#plugin--shift {
  height: 100%;
  background-color: var(--c-bg-default);
}
.navbar {
  background-color: var(--c-bg-subtle);
}
.bodycard {
  background-color: var(--c-bg-subtle);
}
.logo {
  font-size: 1.5em;
  color: var(--c-text-primary);
}
/* Styling for active navigation item */
.active-nav-item {
  background-color: rgba(255, 255, 255, 0.3) !important;
  border-radius: 4px !important;
}
</style>
