<template>
  <div v-if="isVisible" class="modal-overlay">
    <div
      class="modal-content"
      :style="{ top: position.y + 'px', left: position.x + 'px', width: size.width + 'px', height: size.height + 'px' }"
      @mousedown="startDrag"
    >
      <h2>{{ title }}</h2>
      <textarea
        class="modal-textarea"
        v-model="props.message"
      ></textarea>
      <div class="info-text">
        <span v-if="props.useClipboard"><strong>ctrl/⌘ + c</strong> to copy and close</span>
        <span v-else><strong>ctrl/⌘ + ↩</strong> to approve</span>
        <span><strong>esc</strong> to deny</span>
      </div>
      <div class="resize-handle" @mousedown.stop="startResize"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Caido } from '@caido/sdk-frontend';

const props = defineProps<{
  title: string;
  message: string;
  caido: Caido;
  onApprove: (value?: any) => void;
  onDeny: (value?: any) => void;
  useClipboard?: boolean;
  onCopy?: (value?: any) => void;
}>();

const isVisible = ref(true);
const position = ref({ x: 100, y: 100 });
const size = ref({ width: window.innerWidth * 0.6, height: window.innerHeight * 0.8 });
const isDragging = ref(false);
const isResizing = ref(false);
const offset = ref({ x: 0, y: 0 });

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

const handleKeydown = (event: KeyboardEvent) => {
  if (props.useClipboard && event.key === 'c' && (event.metaKey || event.ctrlKey)) {
    copyAndClose();
  } else if (!props.useClipboard && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    approve();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    deny();
  }
};

const copyAndClose = async () => {
  try {
    await navigator.clipboard.writeText(props.message);
    isVisible.value = false;
    if (props.onCopy) {
      props.onCopy(props.message);
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

const approve = () => {
  isVisible.value = false;
  props.onApprove(props.message);
};

const deny = () => {
  isVisible.value = false;
  props.onDeny();
};

const startDrag = (event: MouseEvent) => {
  if (event.target instanceof HTMLElement && event.target.classList.contains('modal-content')) {
    isDragging.value = true;
    offset.value = {
      x: event.clientX - position.value.x,
      y: event.clientY - position.value.y,
    };
  }
};

const startResize = (event: MouseEvent) => {
  isResizing.value = true;
  event.stopPropagation();
};

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    position.value = {
      x: event.clientX - offset.value.x,
      y: event.clientY - offset.value.y,
    };
  } else if (isResizing.value) {
    size.value = {
      width: Math.max(300, event.clientX - position.value.x),
      height: Math.max(200, event.clientY - position.value.y),
    };
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
  isResizing.value = false;
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.modal-content {
  position: absolute;
  background-color: var(--c-bg-subtle);
  border: var(--c-border-width-1) solid var(--c-border-default);
  border-radius: var(--c-border-radius-1);
  padding: var(--c-space-4);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  cursor: move;
}

h2 {
  margin-top: 0;
  margin-bottom: var(--c-space-3);
  color: var(--c-fg-default);
  max-width: fit-content;
}

.modal-textarea {
  flex-grow: 1;
  padding: var(--c-space-2);
  margin-bottom: var(--c-space-3);
  resize: none;
  border: var(--c-border-width-1) solid var(--c-border-default);
  border-radius: var(--c-border-radius-1);
  background-color: var(--c-bg-default);
  outline: var(--c-border-width-2) solid var(--c-fg-secondary);
  color: var(--c-fg-default);
  font-family: inherit;
  font-size: 14px;
}

.info-text {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--c-fg-subtle);
}

.info-text span {
  display: flex;
  align-items: center;
}

.info-text strong {
  background-color: var(--c-bg-default);
  padding: 2px 4px;
  border-radius: 3px;
  margin-right: 4px;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  cursor: se-resize;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 5px;
  height: 5px;
  border-right: 2px solid var(--c-border-default);
  border-bottom: 2px solid var(--c-border-default);
}
</style>
