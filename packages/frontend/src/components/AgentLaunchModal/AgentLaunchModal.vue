<template>
  <div v-if="isVisible" class="agent-launch-modal-backdrop" @click="closeModal">
    <div class="agent-launch-modal" @click.stop>
      <div class="agent-launch-modal-header">
        <h2>Launch {{ agent?.name }}</h2>
        <button class="agent-launch-modal-close" @click="closeModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="agent-launch-modal-body">
        <div class="agent-launch-modal-description">
          <p>{{ agent?.description || 'Configure agent launch settings' }}</p>
        </div>
        
        <!-- Standard fields -->
        <div class="agent-launch-modal-field">
          <label for="jit-instructions">Runtime Instructions</label>
          <textarea 
            id="jit-instructions" 
            v-model="launchConfig.jitInstructions" 
            placeholder="Provide additional instructions for this task..."
            rows="4"
            ref="instructionsTextarea"
            @keydown="handleTextareaKeyDown"
            tabindex="1"
          ></textarea>
        </div>
        
        <div class="agent-launch-modal-field">
          <label for="max-requests">Max Requests</label>
          <input 
            id="max-requests" 
            type="number" 
            v-model="launchConfig.maxRequests" 
            min="1" 
            max="100"
            tabindex="2"
          />
        </div>
        
        <!-- Dynamic fields based on agent definition -->
        <div 
          v-for="(field, index) in dynamicFields" 
          :key="field.id" 
          class="agent-launch-modal-field"
        >
          <label :for="field.id">{{ field.label }}</label>
          
          <!-- Text input -->
          <input 
            v-if="field.type === 'text'" 
            :id="field.id" 
            type="text" 
            v-model="launchConfig.dynamicValues[field.id]" 
            :placeholder="field.placeholder || ''"
            :tabindex="index + 3"
          />
          
          <!-- Textarea -->
          <textarea 
            v-else-if="field.type === 'textarea'" 
            :id="field.id" 
            v-model="launchConfig.dynamicValues[field.id]" 
            :placeholder="field.placeholder || ''"
            :rows="field.rows || 3"
            @keydown="handleTextareaKeyDown"
            :tabindex="index + 3"
          ></textarea>
          
          <!-- Number input -->
          <input 
            v-else-if="field.type === 'number'" 
            :id="field.id" 
            type="number" 
            v-model="launchConfig.dynamicValues[field.id]" 
            :min="field.min" 
            :max="field.max"
            :step="field.step || 1"
            :tabindex="index + 3"
          />
          
          <!-- Select dropdown -->
          <select 
            v-else-if="field.type === 'select'" 
            :id="field.id" 
            v-model="launchConfig.dynamicValues[field.id]"
            :tabindex="index + 3"
          >
            <option 
              v-for="option in field.options" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          
          <!-- Checkbox -->
          <div v-else-if="field.type === 'checkbox'" class="checkbox-container">
            <input 
              :id="field.id" 
              type="checkbox" 
              v-model="launchConfig.dynamicValues[field.id]"
              :tabindex="index + 3"
            />
            <span class="checkbox-label">{{ field.checkboxLabel || field.label }}</span>
          </div>
        </div>
      </div>
      
      <div class="agent-launch-modal-footer">
        <button class="agent-launch-modal-cancel" @click="closeModal" :tabindex="dynamicFields.length + 3">Cancel</button>
        <button class="agent-launch-modal-launch" @click="launchAgent" :tabindex="dynamicFields.length + 4">Launch Agent</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import logger from '@/utils/logger';

// Define types for dynamic fields
interface DynamicField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  options?: Array<{value: any, label: string}>;
  checkboxLabel?: string;
}

// Define props
const props = defineProps<{
  agent: {
    id: string;
    name: string;
    description?: string;
    instructions: string;
    dynamicFields?: DynamicField[];
  } | null;
  isVisible: boolean;
  previousConfig?: {
    jitInstructions: string;
    maxRequests: number;
    dynamicValues: Record<string, any>;
  } | null;
}>();

// Define emits
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'launch', config: any): void;
}>();

// State
const launchConfig = reactive({
  jitInstructions: '',
  maxRequests: 50,
  dynamicValues: {} as Record<string, any>
});

// Refs
const instructionsTextarea = ref<HTMLTextAreaElement | null>(null);

// Computed
const dynamicFields = ref<DynamicField[]>([]);

// Initialize dynamic fields with default values
watch(() => props.agent, (newAgent) => {
  if (newAgent?.dynamicFields) {
    dynamicFields.value = newAgent.dynamicFields;
    
    // Initialize dynamic values with defaults
    dynamicFields.value.forEach(field => {
      if (field.defaultValue !== undefined) {
        launchConfig.dynamicValues[field.id] = field.defaultValue;
      } else {
        // Set appropriate default values based on type
        switch (field.type) {
          case 'text':
          case 'textarea':
            launchConfig.dynamicValues[field.id] = '';
            break;
          case 'number':
            launchConfig.dynamicValues[field.id] = field.min || 0;
            break;
          case 'select':
            launchConfig.dynamicValues[field.id] = field.options?.[0]?.value || '';
            break;
          case 'checkbox':
            launchConfig.dynamicValues[field.id] = false;
            break;
        }
      }
    });
  } else {
    dynamicFields.value = [];
    launchConfig.dynamicValues = {};
  }
}, { immediate: true });

// Watch for modal visibility to focus the textarea and populate previous config if available
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    // If we have a previous config, populate the form fields
    if (props.previousConfig !== undefined && props.previousConfig !== null) {
      launchConfig.jitInstructions = props.previousConfig.jitInstructions || '';
      launchConfig.maxRequests = props.previousConfig.maxRequests || 50;
      
      // Populate dynamic values if they exist
      if (props.previousConfig.dynamicValues) {
        Object.keys(props.previousConfig.dynamicValues).forEach(key => {
          launchConfig.dynamicValues[key] = props.previousConfig.dynamicValues[key];
        });
      }
    }
    
    nextTick(() => {
      if (instructionsTextarea.value) {
        instructionsTextarea.value.focus();
      }
    });
  }
}, { immediate: true });

// Methods
const closeModal = () => {
  emit('close');
};

const launchAgent = () => {
  // Validate required fields
  const requiredFields = dynamicFields.value.filter(field => field.required);
  const missingFields = requiredFields.filter(field => {
    const value = launchConfig.dynamicValues[field.id];
    return value === undefined || value === null || value === '';
  });
  
  if (missingFields.length > 0) {
    alert(`Please fill in the following required fields: ${missingFields.map(f => f.label).join(', ')}`);
    return;
  }
  
  // Emit launch event with config
  emit('launch', {
    agentId: props.agent?.id,
    jitInstructions: launchConfig.jitInstructions,
    maxRequests: launchConfig.maxRequests,
    dynamicValues: launchConfig.dynamicValues
  });
  
  // Reset form
  launchConfig.jitInstructions = '';
  launchConfig.maxRequests = 50;
  launchConfig.dynamicValues = {};
  
  // Close modal
  closeModal();
};

// Handle textarea keydown events (Enter to submit, Shift+Enter for new line)
const handleTextareaKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    launchAgent();
  }
};

// Handle escape key to close modal
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isVisible) {
    closeModal();
  }
};

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  logger.log('AgentLaunchModal mounted');
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  logger.log('AgentLaunchModal unmounted');
});
</script>
