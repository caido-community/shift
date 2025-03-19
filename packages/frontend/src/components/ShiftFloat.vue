<template>
  <div
    class="shift-floating-textarea"
    :style="{ top: position.y + 'px', left: position.x + 'px', width: size.width + 'px', height: size.height + 'px' }"
    @mousedown="startDrag"
  >
    <div v-if="!isAuthenticated" class="shift-auth-overlay">
      <div class="auth-message">
        You're not authenticated. Go to <a href="#/shift" class="settings-link" @click="close">Shift settings</a> to apply your API key.
      </div>
    </div>
    <textarea
      ref="textarea"
      class="shift-textarea"
      v-model="text"
      :placeholder="placeholder"
      :disabled="!isAuthenticated"
      @keydown.esc.prevent="close"
      @input="handleTextInput"
      @focus="refreshContext"
      autofocus
    ></textarea>
    <div v-if="(context?.context?.requestSelectedText?.length > MAX_SIZE/1024) || (context?.context?.responseSelectedText?.length > MAX_SIZE/1024)" class="context-info">
      <span style="color: var(--c-fg-secondary)">NOTE: the selected text is too large and will be truncated</span>
    </div>
    <div class="context-info">
      <span>current context: <strong>{{ context.activeEntity }}</strong></span>
      <span v-if="isLoading" class="loading-indicator">
        generating<span class="loading-dots">{{ loadingDots }}</span>
      </span>
      <span v-else-if="isCompleted" class="completed-indicator">
        completed.
      </span>
    </div>
    <div class="context-info">
      context keys: <strong :title="`Context values above ${MAX_SIZE/1024}KB will be truncated.`">{{ contextFormatter(context.context) }}</strong>
    </div>
    <div class="info-text">
      <span><strong>↩</strong> to submit</span>
      <span><strong>esc</strong> to close</span>
      <span><strong>↑↓</strong> for history</span>
      <span><strong>tab</strong> to use history</span>
    </div>
    <div class="resize-handle" @mousedown.stop="startResize"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount, onUnmounted, watch, computed, nextTick } from 'vue';
import { onKeyStroke } from "@vueuse/core";
import { getShiftContext } from '../utils/shiftUtils';
import type { Caido } from "@caido/sdk-frontend";
import { ActiveEntity, MAX_SIZE, MAX_UNDO_HISTORY, PLACEHOLDER_PROMPT } from '../constants';
import logger from "../utils/logger";
import { getPluginStorage, setPluginStorage } from "../utils/caidoUtils";
import { isAuthenticated, eventBus } from '../utils/eventBus'
logger.log("ShiftFloat script setup started");
logger.log("isAuthenticated", isAuthenticated.value);

const props = defineProps<{
  onSubmit: (text: string, activeEntity: ActiveEntity, context: any) => Promise<string>;
  onClose: () => void;
  caido: Caido;
  onPositionChange: (x: number, y: number) => void;
}>();

const text = ref('');
const firstRun = ref(true);
const placeholderText = PLACEHOLDER_PROMPT;
const context = ref({"activeEntity":"", "context": {}});
const placeholder = ref(placeholderText);
// const storage = await getPluginStorage(props.caido);
// const { x, y } = storage.shiftFloatingPosition;
const position = ref({ x: 100, y: 100 });
const size = ref({ width: 500, height: 200 });
const isDragging = ref(false);
const isResizing = ref(false);
const offset = ref({ x: 0, y: 0 });
const textarea = ref<HTMLTextAreaElement | null>(null);

// logger.log("x", x);
// logger.log("y", y); 
logger.log("position", position.value);
logger.log("size", size.value);

const commandHistory = ref<string[]>([]);
let historyIndex = -1;

const isLoading = ref(false);
const isCompleted = ref(false);
const loadingDots = ref('');
const result = ref('');

let loadingInterval: number | null = null;
const lastFocusedEditor = ref(null);

const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);

const isUndoRedoOperation = ref(false);

const contextFormatter = (context: any)=>{
  let truncated = context.truncated;
  let contextString = Object.keys(context).filter(key => context[key]!=='' && context[key]!==undefined && key !== 'truncated').join(', ');
  if (truncated) {
    for (const key of truncated) {
      contextString = contextString.replace(key+",", key+"*,");
    }
  }
  return contextString;
}

const startLoading = () => {
  isLoading.value = true;
  isCompleted.value = false;
  let dotCount = 0;
  loadingInterval = window.setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    loadingDots.value = '.'.repeat(dotCount);
  }, 200);
};

const stopLoading = () => {
  isLoading.value = false;
  isCompleted.value = true;
  if (loadingInterval !== null) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
  loadingDots.value = '';
};

const refreshContext = async () => {
  if (firstRun.value) { firstRun.value = false; return }
  logger.log("Refreshing context");
  lastFocusedEditor.value = (document.querySelector('.cm-focused .cm-content') as any)?.cmView?.view || lastFocusedEditor.value;
  context.value = await getShiftContext(props.caido, lastFocusedEditor.value);
  logger.log("Last focused editor:", lastFocusedEditor.value);
  logger.log("Context after refresh:", context.value);
};

const loadCommandHistory = async () => {
  const storage = await getPluginStorage(props.caido);
  logger.log("setting command history:", storage.shiftCommandHistory);
  commandHistory.value = storage.shiftCommandHistory;
};

const saveCommandHistory = async () => {
  const storage = await getPluginStorage(props.caido);
  storage.shiftCommandHistory = commandHistory.value;
  await setPluginStorage(props.caido, storage);
};

const addToHistory = (command: string) => {
  commandHistory.value.unshift(command);
  if (commandHistory.value.length > 50) {
    commandHistory.value.pop();
  }
  saveCommandHistory();
};

const submit = async () => {
  if (text.value.trim()) {
    startLoading();
    addToHistory(text.value);
    try {
      result.value = await props.onSubmit(text.value, context.value.activeEntity, context.value.context);
    } finally {
      stopLoading();
      text.value = '';
      historyIndex = -1;
      placeholder.value = placeholderText;
    }
  }
};

const close = () => {
  props.onClose();
};

const startDrag = (event: MouseEvent) => {
  if (event.target === textarea.value) return;
  isDragging.value = true;
  offset.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
  props.onPositionChange(position.value.x, position.value.y);
  logger.log("Position changed to:", position.value);
};

const drag = (event: MouseEvent) => {
  if (isDragging.value) {
    position.value = {
      x: event.clientX - offset.value.x,
      y: event.clientY - offset.value.y,
    };
  }
};

const stopDrag = () => {
  logger.log("Stopping drag");
  isDragging.value = false;
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
  props.onPositionChange(position.value.x, position.value.y);
};

const startResize = (event: MouseEvent) => {
  event.stopPropagation();
  isResizing.value = true;
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopResize);
};

const resize = (event: MouseEvent) => {
  if (isResizing.value) {
    const newWidth = event.clientX - position.value.x;
    const newHeight = event.clientY - position.value.y;
    size.value = {
      width: Math.max(200, newWidth),
      height: Math.max(100, newHeight),
    };
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
};

const scrollHistory = (direction: number) => {
  if (text.value.trim() === '') {
    historyIndex += direction;
    if (historyIndex < 0) historyIndex = 0;
    if (historyIndex >= commandHistory.value.length) historyIndex = commandHistory.value.length - 1;
    if (commandHistory.value[historyIndex]) {
      placeholder.value = commandHistory.value[historyIndex];
    }
  }
};

const pushToUndoStack = (value: string) => {
  if (undoStack.value.length >= MAX_UNDO_HISTORY) {
    undoStack.value.shift(); // Remove oldest entry
  }
  undoStack.value.push(value);
  redoStack.value = []; // Clear redo stack on new changes
};

const undo = () => {
  if (undoStack.value.length > 0) {
    isUndoRedoOperation.value = true;
    const currentText = text.value;
    const previousText = undoStack.value.pop()!;
    redoStack.value.push(currentText);
    text.value = previousText;
    isUndoRedoOperation.value = false;
  }
};

const redo = () => {
  if (redoStack.value.length > 0) {
    isUndoRedoOperation.value = true;
    const currentText = text.value;
    const nextText = redoStack.value.pop()!;
    undoStack.value.push(currentText);
    text.value = nextText;
    isUndoRedoOperation.value = false;
  }
};

onBeforeMount(async () => {
  const storage = await getPluginStorage(props.caido);
  eventBus.setAuthenticated(!!storage.apiKey);
  
  logger.log("FloatingTextArea onBeforeMount");
  lastFocusedEditor.value = (document.querySelector('.cm-editor.cm-focused .cm-content') as any)?.cmView?.view || lastFocusedEditor.value;
  context.value = await getShiftContext(props.caido, lastFocusedEditor.value);
  logger.log("Context after onBeforeMount:", context.value);
});

onMounted(async () => {
  logger.log("FloatingTextArea onMounted");
  textarea.value?.focus();
  await loadCommandHistory();
});

onUnmounted(() => {
  logger.log("FloatingTextArea onUnmounted");
});

onKeyStroke("Enter", (e) => {
  if (e.target === textarea.value && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
});

onKeyStroke("Escape", (e) => {
  logger.log("Escape key pressed", e.target);
  const floatingTextarea = document.querySelector('.shift-floating-textarea');
  const authOverlay = document.querySelector('.shift-auth-overlay');
  if (floatingTextarea?.contains(e.target as Node) || e.target === floatingTextarea || authOverlay) {
    e.preventDefault();
    close();
  }
});

onKeyStroke("ArrowUp", (e) => {
  if (e.target === textarea.value) {
    e.preventDefault();
    scrollHistory(1);
  }
});

onKeyStroke("ArrowDown", (e) => {
  if (e.target === textarea.value) {
    e.preventDefault();
    scrollHistory(-1);
  }
});

onKeyStroke("Tab", (e) => {
  if (e.target === textarea.value && text.value.trim() === '' && historyIndex >= 0 && placeholder.value !== placeholderText) {
    e.preventDefault();
    text.value = placeholder.value;
    placeholder.value = placeholderText;
  }
});

onKeyStroke(['z'], (e: KeyboardEvent) => {
  if (e.target === textarea.value && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
    logger.log('Undo shortcut triggered');
    e.preventDefault();
    undo();
  }
});

onKeyStroke(['y'], (e: KeyboardEvent) => {
  if (e.target === textarea.value && (e.ctrlKey || e.metaKey)) {
    logger.log('Redo shortcut triggered (Ctrl+Y)');
    e.preventDefault();
    redo();
  }
});

onKeyStroke(['z'], (e: KeyboardEvent) => {
  if (e.target === textarea.value && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    logger.log('Redo shortcut triggered (Ctrl+Shift+Z)');
    e.preventDefault();
    redo();
  }
});

watch(text, (newValue) => {
  if (newValue.trim() === '') {
    placeholder.value = placeholderText;
    historyIndex = -1;
  }
});

const handleTextInput = (e: InputEvent) => {
  logger.log("handleTextInput", e);
  if (!isUndoRedoOperation.value) {
    logger.log("Pushing to undo stack:", text.value);
    pushToUndoStack(text.value);
  }
};

logger.log("ShiftFloat script setup finished");
</script>

<style scoped>
.shift-floating-textarea {
  position: fixed;
  z-index: 9999;
  background-color: var(--c-bg-subtle);
  border: var(--c-border-width-1) solid var(--c-border-default);
  border-radius: var(--c-border-radius-1);
  padding: var(--c-space-2);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.shift-textarea {
  width: 100%;
  color: var(--c-fg-default);
  height: calc(100% - 30px); /* Adjust for info-text height */
  padding: var(--c-space-2);
  resize: none;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 14px;
  border-radius: var(--c-border-radius-1);
  background-color: var(--c-bg-default);
}

.shift-textarea:focus {
 outline: var(--c-border-width-2) solid var(--c-fg-secondary);
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
.context-info {
    font-size: 12px;
    padding-top: 8px;
    color: var(--c-fg-subtle);
    display: flex;  /* Add this */
    justify-content: space-between;  /* Add this */
    align-items: center;  /* Add this */
}
.context-info strong {
    background-color: var(--c-bg-default);
    padding: 1px 4px;
    border-radius: 3px;
    color: var(--c-fg-subtle);
    margin-right: 4px;
    cursor: help;
}

.loading-indicator,
.completed-indicator {
  font-size: 12px;
  color: var(--c-fg-subtle);
  margin-left: auto; /* This will push it to the right */
}

.loading-dots {
  display: inline-block;
  width: 24px;
}

.shift-auth-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--c-bg-default-rgb), 0.9);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  border-radius: var(--c-border-radius-1);
}

.auth-message {
  text-align: center;
  color: var(--c-fg-default);
  padding: var(--c-space-4);
  background-color: var(--c-bg-subtle);
  border-radius: var(--c-border-radius-1);
  border: var(--c-border-width-1) solid var(--c-border-default);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-link {
  color: var(--c-fg-secondary);
  text-decoration: none;
  font-weight: 500;
}

.settings-link:hover {
  text-decoration: underline;
}
</style>

