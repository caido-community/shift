import { ref } from 'vue'
import { isDev } from '../constants';

export const isAuthenticated = ref(false) || isDev;

export const eventBus = {
  setAuthenticated(value: boolean) {
    isAuthenticated.value = value || isDev;
  }
} 