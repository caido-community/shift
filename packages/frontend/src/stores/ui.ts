import { defineStore } from "pinia";
import { readonly, shallowRef } from "vue";

const MIN_DRAWER_WIDTH = 560;
const MAX_DRAWER_WIDTH = 1200;
const DEFAULT_DRAWER_WIDTH = 560;
const MAX_VIEWPORT_RATIO = 0.9;

const getMaxWidth = () => Math.min(MAX_DRAWER_WIDTH, window.innerWidth * MAX_VIEWPORT_RATIO);

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
    drawerWidth.value = Math.max(MIN_DRAWER_WIDTH, Math.min(getMaxWidth(), width));
  };

  const clampDrawerWidth = () => {
    drawerWidth.value = Math.max(MIN_DRAWER_WIDTH, Math.min(getMaxWidth(), drawerWidth.value));
  };

  return {
    drawerVisible: readonly(drawerVisible),
    drawerWidth: readonly(drawerWidth),
    toggleDrawer,
    setDrawerVisible,
    setDrawerWidth,
    clampDrawerWidth,
  };
});
