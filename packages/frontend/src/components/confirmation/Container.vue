<script setup lang="ts">
import { useKeyModifier } from "@vueuse/core";
import Textarea from "primevue/textarea";

const props = defineProps<{
  fileName: string;
  content: string;
  onConfirm: () => void;
}>();

const ctrl = useKeyModifier("Control");
const meta = useKeyModifier("Meta");

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && (ctrl.value === true || meta.value === true)) {
    event.preventDefault();
    props.onConfirm();
  }
};
</script>

<template>
  <div
    class="flex flex-col gap-2 h-[250px] w-[400px] items-end"
    @keydown="handleKeydown"
  >
    <Textarea :value="props.content" readonly class="flex-1 w-full" />
    <button
      class="bg-primary-700 border border-primary-700 rounded-md cursor-pointer text-white px-4 py-2"
      @click="props.onConfirm"
    >
      Confirm (Ctrl+Enter)
    </button>
  </div>
</template>
