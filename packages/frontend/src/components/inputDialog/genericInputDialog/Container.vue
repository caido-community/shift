<script setup lang="ts">
import { onMounted, ref } from "vue";

const props = defineProps<{
  title: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  initialValue?: string;
}>();

const inputValue = ref(props.initialValue ?? "");

onMounted(() => {
  // Focus the textarea when the component mounts
  setTimeout(() => {
    const textarea = document.querySelector("textarea[autofocus]");
    if (textarea instanceof HTMLTextAreaElement) {
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
  } else if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight"
  ) {
    event.stopPropagation();
  }
};

const handleInput = (event: Event) => {
  const target = event.target;
  if (target && target instanceof HTMLTextAreaElement) {
    inputValue.value = target.value;
  }
};
</script>

<template>
  <div class="flex flex-col gap-4 w-[500px] p-2" @keydown="handleKeydown">
    <textarea
      :placeholder="placeholder || 'Enter your instructions...'"
      class="w-full h-24 p-3 border border-surface-600 rounded-md bg-surface-800 text-surface-100 placeholder-surface-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      rows="4"
      autofocus
      :value="inputValue"
      @input="handleInput"
    />

    <div class="text-xs text-surface-400 text-center">
      Ctrl+Enter to confirm, Escape to cancel
    </div>
  </div>
</template>
