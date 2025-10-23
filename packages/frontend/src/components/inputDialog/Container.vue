<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  title: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  initialValue?: string;
}>();

const inputValue = ref(props.initialValue || "");

onMounted(() => {
  // Focus the textarea when the component mounts
  setTimeout(() => {
    const textarea = document.querySelector('textarea[autofocus]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  }, 0);
});

const handleConfirm = () => {
  props.onConfirm(inputValue.value);
};

const handleCancel = () => {
  // Close the dialog by calling onConfirm with empty string
  props.onCancel();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    event.stopPropagation();
    handleConfirm();
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    handleCancel();
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.stopPropagation();
  }
};
</script>

<template>
  <div
    class="flex flex-col gap-4 w-[500px] p-2"
  >
    <textarea
      :placeholder="placeholder || 'Enter your instructions...'"
      class="w-full h-24 p-3 border border-surface-600 rounded-md bg-surface-800 text-surface-100 placeholder-surface-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      rows="4"
      autofocus
      :value="inputValue"
      @input="(event) => {
        const value = (event.target as HTMLTextAreaElement).value;
        inputValue = value;
      }"
      @keydown="handleKeydown"
    />
    
    <div class="text-xs text-surface-400 text-center">
      Ctrl+Enter to confirm, Escape to cancel
    </div>
  </div>
</template>
