<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";

const { title, message } = defineProps<{
  title: string;
  message: string;
}>();

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  confirm: [];
}>();

const handleConfirm = () => {
  emit("confirm");
  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="title"
    :style="{ width: '25rem' }"
    :pt="{
      header: { style: 'padding: 1rem' },
      content: { style: 'padding: 0 1rem' },
      footer: { style: 'padding: 1rem' },
    }">
    <div class="text-surface-200 text-sm">
      {{ message }}
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="handleCancel" />
      <Button
        label="Confirm"
        severity="danger"
        @click="handleConfirm" />
    </template>
  </Dialog>
</template>
