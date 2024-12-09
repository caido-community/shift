import { ref } from 'vue'

export const isAuthenticated = ref(false)

export const eventBus = {
  setAuthenticated(value: boolean) {
    isAuthenticated.value = value
  }
} 