<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  title: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
}>();

const inputValue = ref("");
const textareaRef = ref<HTMLTextAreaElement>();

onMounted(() => {
  // Focus the textarea when the component mounts
  if (textareaRef.value) {
    textareaRef.value.focus();
  }
});

const handleConfirm = () => {
  props.onConfirm(inputValue.value);
};

const handleCancel = () => {
  // Close the dialog by calling onConfirm with empty string
  props.onConfirm("Proceed.");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    handleConfirm();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    handleCancel();
  }
};
</script>

<template>
  <div
    class="flex flex-col gap-4 w-[500px] p-2"
    @keydown="handleKeydown"
  >
    <textarea
         :placeholder="placeholder || 'Enter your instructions...'"
      class="w-full h-24 p-3 border border-surface-600 rounded-md bg-surface-800 text-surface-100 placeholder-surface-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      rows="4"
      @input="(event) => {
        const value = (event.target as HTMLTextAreaElement).value;
        inputValue = value;
      }"
    />
    
    <div class="text-xs text-surface-400 text-center">
      Ctrl+Enter to confirm, Escape to cancel
    </div>
  </div>
</template>
