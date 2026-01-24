import { defineStore } from "pinia";
import { readonly, shallowRef } from "vue";

const MIN_DRAWER_WIDTH = 560;
const MAX_DRAWER_WIDTH = 1200;
const DEFAULT_DRAWER_WIDTH = 560;

export const useUIStore = defineStore("ui", () => {
  const drawerVisible = shallowRef(false);
  const drawerWidth = shallowRef(DEFAULT_DRAWER_WIDTH);

  const toggleDrawer = () => {
    drawerVisible.value = !drawerVisible.value;
  };

  const setDrawerVisible = (visible: boolean) => {
    drawerVisible.value = visible;
  };

  const setDrawerWidth = (width: number) => {
    drawerWidth.value = Math.max(MIN_DRAWER_WIDTH, Math.min(MAX_DRAWER_WIDTH, width));
  };

  return {
    drawerVisible: readonly(drawerVisible),
    drawerWidth: readonly(drawerWidth),
    toggleDrawer,
    setDrawerVisible,
    setDrawerWidth,
  };
});
