import { computed, ref } from "vue";

import { useSettingsStore } from "@/stores/settings";

export function useDetailToggle() {
  const settingsStore = useSettingsStore();
  const override = ref<boolean>();
  const isOpen = computed(() => override.value ?? settingsStore.chatAppearance === "expanded");

  const toggle = () => {
    override.value = !isOpen.value;
  };

  return { isOpen, toggle };
}
