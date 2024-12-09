<template>
  <Transition name="toast">
    <div v-if="isVisible" 
         :class="['toast-container', variant]"
         :style="{ bottom: `${position}px` }">
      <div class="toast-content">
        <span class="message">
          {{ message }}
        </span>
        <div class="actions">
          <button class="feedback-btn" 
                  :disabled="feedbackSubmitted || variant === 'error'"
                  @click="submitFeedback('positive')"
                  :class="{ disabled: feedbackSubmitted || variant === 'error', 'no-feedback': variant === 'error' }">
            👍
          </button>
          <button class="feedback-btn "
                  :disabled="feedbackSubmitted || variant === 'error'"
                  @click="submitFeedback('negative')"
                  :class="{ disabled: feedbackSubmitted || variant === 'error', 'no-feedback': variant === 'error' }">
            👎
          </button>
          <button class="close-btn" @click="close">×</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { API_ENDPOINT } from '../constants';
import type { ActiveEntity } from '../constants';
import logger from "../utils/logger";

interface ServerResponse {
  id: string;
  actions: any[];
  // Add other response fields as needed
}

const props = defineProps<{
  variant: 'success' | 'info' | 'error'
  duration: number
  responseId: string
  apiKey: string
  position?: number
  message: string
  // Add new props
  userInput?: string
  activeEntity?: ActiveEntity
  context?: any
  serverResponse?: ServerResponse
}>();

const emit = defineEmits(['close']);

const isVisible = ref(true);
const feedbackSubmitted = ref(false);
let timeout: number;

const position = props.position || 20;

onMounted(() => {
  if (props.duration > 0) {
    timeout = window.setTimeout(() => {
      close();
    }, props.duration);
  }
});

onBeforeUnmount(() => {
  if (timeout) {
    clearTimeout(timeout);
  }
});

const close = () => {
  isVisible.value = false;
  emit('close');
};

const submitFeedback = async (type: 'positive' | 'negative') => {
  try {
    feedbackSubmitted.value = true;
    const response = await fetch(`${API_ENDPOINT}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.apiKey}`
      },
      body: JSON.stringify({
        responseId: props.responseId,
        feedback: type,
        userInput: props.userInput,
        activeEntity: props.activeEntity,
        context: props.context,
        serverResponse: props.serverResponse
      })
    });
    close();
    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }
  } catch (error) {
    logger.error('Error submitting feedback:', error);
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  min-width: 300px;
  max-width: 500px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.message {
  flex: 1;
  color: white;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feedback-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  font-size: 16px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.feedback-btn:hover:not(.disabled) {
  opacity: 1;
}

.feedback-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 20px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.success {
  background-color: #4caf50;
}

.info {
  background-color: #2196f3;
}

.error {
  background-color: #f44336;
}

/* Toast animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translate(-50%, 100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}
.no-feedback {
  display: none;
}
</style> 