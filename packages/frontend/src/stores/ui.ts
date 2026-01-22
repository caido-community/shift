import { defineStore } from "pinia";
import { readonly, shallowRef } from "vue";

export const useUIStore = defineStore("ui", () => {
  const drawerVisible = shallowRef(false);

  const toggleDrawer = () => {
    drawerVisible.value = !drawerVisible.value;
  };

  const setDrawerVisible = (visible: boolean) => {
    drawerVisible.value = visible;
  };

  return {
    drawerVisible: readonly(drawerVisible),
    toggleDrawer,
    setDrawerVisible,
  };
});
