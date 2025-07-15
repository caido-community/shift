<template>
  <div class="p-6 h-full max-h-screen overflow-y-auto bg-[var(--c-bg-default)]">
    <!-- API Key Section (not in card) -->
    <div class="mb-8 pb-6 border-b border-[var(--c-border-default)]">
      <h2 class="text-xl font-semibold text-white mb-2">API Key</h2>
      <p class="text-sm text-[var(--c-fg-secondary)] mb-4">
        Your API key to access Shift features. This is required for AI functionality.
      </p>
      
      <div class="flex items-start gap-6 mb-4">
        <!-- API Key Input Section -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <input 
              type="password" 
              id="apiKey" 
              v-model="apiKey"
              class="w-full bg-[var(--c-bg-subtle)] border border-[var(--c-border-default)] rounded-lg text-white px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--c-fg-primary)] focus:border-transparent"
              placeholder="Enter your API key"
            />
            <span v-if="validationAttempted" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-lg" :class="{ 'text-green-500': isApiKeyValid, 'text-red-500': !isApiKeyValid }">
              {{ isApiKeyValid ? '✓' : '✗' }}
            </span>
          </div>
        </div>
        
        <!-- Compact Usage Info -->
        <div v-if="validationAttempted && tokensUsed !== null && tokensLimit !== null" class="flex-shrink-0">
          <div class="text-xs font-medium text-[var(--c-fg-secondary)] mb-1">Usage</div>
          <div class="w-32">
            <div class="h-1.5 bg-[var(--c-bg-subtle)] rounded-full overflow-hidden border border-[var(--c-border-default)]">
              <div 
                class="h-full bg-green-500 transition-all duration-300 ease-in-out" 
                :style="{ width: `${Math.min((tokensUsed / tokensLimit) * 100, 100)}%`, height: '1.5px' }"
                :class="{ 'bg-red-500': !isApiKeyValid || tokensUsed > tokensLimit }"
              ></div>
            </div>
            <div class="text-xs text-[var(--c-fg-secondary)] mt-1">
              {{ tokensUsed?.toLocaleString() || 0 }} / {{ tokensLimit?.toLocaleString() || 0 }}
            </div>
            <div v-if="!isApiKeyValid" class="text-xs text-red-500">Invalid Key</div>
            <div v-else-if="tokensUsed > tokensLimit" class="text-xs text-red-500">Limit exceeded</div>
          </div>
        </div>
      </div>
      
      <div class="text-sm text-[var(--c-fg-secondary)]">
        Shift has been acquired by Caido and <u class="text-[var(--c-fg-primary)]">they've opted to make it free!</u> We'll take care of generating an API key for you.
      </div>
    </div>

    <!-- AI Rename Replay Tabs Card (Full Width) -->
    <Card class="mb-6 bg-[var(--c-bg-subtle)]" :class="{ 'opacity-60 pointer-events-none': !isApiKeyValid }">
      <template #header>
        <div class="p-4" style="border-bottom: 1px solid #26272c;">
          <h3 class="text-lg font-semibold text-white m-0">AI Rename Replay Tabs</h3>
          <p class="text-sm text-[var(--c-fg-secondary)] mt-1 mb-0">
            Automatically rename replay tabs using AI to provide meaningful descriptions.
          </p>
        </div>
      </template>
      <template #content>
        <div class="p-4">
          <!-- Main Enable Toggle -->
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-2">
              <InputSwitch
                v-model="settings.aiRenameReplayTabs"
                inputId="aiRenameReplayTabs"
                :disabled="!isApiKeyValid"
              />
              <label for="aiRenameReplayTabs" class="text-white cursor-pointer" :class="{ 'text-[var(--c-fg-disabled)]': !isApiKeyValid }">
                Enable AI Rename Replay Tabs
              </label>
            </div>
            <p class="text-sm text-[var(--c-fg-secondary)]">
              Note: This will only rename tabs that have not been renamed yet.
            </p>
          </div>

          <!-- Settings when enabled -->
          <div v-if="settings.aiRenameReplayTabs" class="space-y-6 pl-4 border-l-2 border-[var(--c-border-default)]">
            <!-- Rename Delay -->
            <div class="flex flex-col gap-2">
              <label for="renameDelay" class="text-sm font-medium text-white" :class="{ 'text-[var(--c-fg-disabled)]': !isApiKeyValid }">
                Rename Delay (seconds)
              </label>
              <input
                type="number"
                v-model.number="settings.renameDelay"
                id="renameDelay"
                :disabled="!isApiKeyValid"
                class="w-24 text-center rounded-lg bg-[var(--c-bg-default)] border border-[var(--c-border-default)] text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--c-fg-primary)] focus:border-transparent disabled:bg-[var(--c-bg-disabled)] disabled:text-[var(--c-fg-disabled)] disabled:cursor-not-allowed"
                min="0"
                step="1"
              />
              <p class="text-xs text-[var(--c-fg-secondary)]">
                How long to wait before automatically renaming a tab
              </p>
            </div>

            <!-- Rename Existing Tabs -->
            <div>
              <div class="flex items-center gap-3 mb-2">
                <InputSwitch
                  v-model="settings.renameExistingTabs"
                  inputId="renameExistingTabs"
                  :disabled="!isApiKeyValid"
                />
                <label for="renameExistingTabs" class="text-white cursor-pointer" :class="{ 'text-[var(--c-fg-disabled)]': !isApiKeyValid }">
                  Rename Existing Replay Tabs
                </label>
              </div>
              <p class="text-sm text-[var(--c-fg-secondary)]">
                Use only if you want all tabs to be renamed, including previously created ones
              </p>
            </div>

            <!-- Rename Instructions -->
            <div class="flex flex-col gap-2">
              <label for="renameInstructions" class="text-sm font-medium text-white" :class="{ 'text-[var(--c-fg-disabled)]': !isApiKeyValid }">
                Rename Instructions
              </label>
              <textarea
                v-model="settings.renameInstructions"
                id="renameInstructions"
                rows="4"
                :disabled="!isApiKeyValid"
                placeholder="Provide custom instructions for how tabs should be renamed..."
                class="textarea-focus w-full min-h-[100px] resize-y rounded-lg bg-[var(--c-bg-default)] text-white p-3 text-sm disabled:bg-[var(--c-bg-disabled)] disabled:text-[var(--c-fg-disabled)] disabled:cursor-not-allowed"
              ></textarea>
              <p class="text-xs text-[var(--c-fg-secondary)]">
                Custom instructions for the AI when renaming tabs
              </p>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Memory and AI Instructions Side-by-Side -->
    <div class="flex gap-6" :class="{ 'opacity-60 pointer-events-none': !isApiKeyValid }">
      <!-- Memory Card -->
      <Card class="flex-1 bg-[var(--c-bg-subtle)]">
        <template #header>
          <div class="p-4" style="border-bottom: 1px solid #26272c;">
            <h3 class="text-lg font-semibold text-white m-0">Memory</h3>
            <p class="text-sm text-[var(--c-fg-secondary)] mt-1 mb-0">
              Free-form notes for the AI to use when making decisions or filling in data.
            </p>
          </div>
        </template>
        <template #content>
          <div class="p-4">
            <textarea
              v-model="memoryForCurrentProject"
              id="memory"
              rows="8"
              :placeholder="PLACEHOLDER_MEMORY"
              :disabled="!isApiKeyValid"
              class="textarea-focus w-full min-h-[200px] font-mono text-sm whitespace-pre resize-y rounded-lg bg-[var(--c-bg-default)] text-white p-3 disabled:bg-[var(--c-bg-disabled)] disabled:text-[var(--c-fg-disabled)] disabled:cursor-not-allowed"
            ></textarea>
          </div>
        </template>
      </Card>

      <!-- AI Instructions Card -->
      <Card class="flex-1 bg-[var(--c-bg-subtle)]">
        <template #header>
          <div class="p-4" style="border-bottom: 1px solid #26272c;">
            <h3 class="text-lg font-semibold text-white m-0">AI Instructions</h3>
            <p class="text-sm text-[var(--c-fg-secondary)] mt-1 mb-0">
              Define shortcuts and special instructions for the AI to follow.
            </p>
          </div>
        </template>
        <template #content>
          <div class="p-4">
            <textarea
              v-model="aiInstructionsForCurrentProject"
              id="aiInstructions"
              rows="8"
              :placeholder="PLACEHOLDER_AI_INSTRUCTIONS"
              :disabled="!isApiKeyValid"
              class="textarea-focus w-full min-h-[200px] font-mono text-sm whitespace-pre resize-y rounded-lg bg-[var(--c-bg-default)] text-white p-3 disabled:bg-[var(--c-bg-disabled)] disabled:text-[var(--c-fg-disabled)] disabled:cursor-not-allowed"
            ></textarea>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import Card from 'primevue/card';
import InputSwitch from 'primevue/inputswitch';
import type { Caido } from "@caido/sdk-frontend";
import { getCurrentProjectName, getPluginStorage, setPluginStorage } from '../../utils/caidoUtils';
import { isDev, PAGE, PluginStorage, DEFAULT_PLUGIN_STORAGE, PLACEHOLDER_AI_INSTRUCTIONS, PLACEHOLDER_MEMORY} from '../../constants';
import logger from "../../utils/logger";
import { eventBus } from '../../utils/eventBus'
import { fetchAPIKey } from '../../utils/shiftUtils';

interface ValidationResponse {
  is_valid: boolean;
  tokens_used: number;
  tokens_limit: number;
}

export default defineComponent({
  name: 'ShiftUIComponent',
  components: {
    Card,
    InputSwitch
  },
  emits: ['authenticated'],
  props: {
    caido: {
      type: Object as () => Caido,
      required: true
    },
    apiEndpoint: {
      type: String,
      required: true
    },
    startRenameInterval: {
      type: Function,
      required: true
    },
    updateMemory: {
      type: Boolean,
      required: true
    }
  },
  setup(props, { emit }) {
    const apiKey = ref('');
    const isApiKeyValid = ref(false);
    const tokensUsed = ref<number | null>(null);
    const tokensLimit = ref<number | null>(null);
    const validationAttempted = ref(false);
    const projectName = getCurrentProjectName() || 'default';

    const settings = ref<PluginStorage['settings']>(DEFAULT_PLUGIN_STORAGE.settings);

    // Computed property for memory that handles the project-based structure
    const memoryForCurrentProject = computed({
      get: () => {
        if (typeof settings.value.memory === 'string') {
          return settings.value.memory;
        }
        return settings.value.memory[projectName] || '';
      },
      set: (value: string) => {
        if (typeof settings.value.memory === 'string') {
          settings.value.memory = {
            [projectName]: value
          };
        } else {
          settings.value.memory[projectName] = value;
        }
      }
    });

    // Computed property for aiInstructions that handles the project-based structure
    const aiInstructionsForCurrentProject = computed({
      get: () => {
        if (typeof settings.value.aiInstructions === 'string') {
          return settings.value.aiInstructions;
        }
        return settings.value.aiInstructions[projectName] || '';
      },
      set: (value: string) => {
        if (typeof settings.value.aiInstructions === 'string') {
          settings.value.aiInstructions = {
            [projectName]: value
          };
        } else {
          settings.value.aiInstructions[projectName] = value;
        }
      }
    });

    // Fix the watch to properly watch a reactive source
    watch(() => props.updateMemory, async (newVal) => {
      logger.log("updateMemory", newVal);
      let storage = await getPluginStorage(props.caido);
      if (storage.settings) {
        settings.value = {
          ...settings.value,
          ...storage.settings
        };
        logger.log("settings updated", settings.value);
      }
    })

    // Auto-save on API key changes
    watch(apiKey, async (newKey) => {
      if (newKey && newKey.length > 0) {
        await validateAndSave();
      }
    });

    watch(settings, async (newSettings) => {
      logger.log("settings updated", settings.value, newSettings);
      let storage = await getPluginStorage(props.caido);
      const currentProjectName = getCurrentProjectName() || 'default';
      
      // Check if memory has changed
      const oldMemory = typeof storage.settings.memory === 'string' 
        ? storage.settings.memory 
        : (storage.settings.memory[currentProjectName] || '');
      
      const newMemory = typeof newSettings.memory === 'string'
        ? newSettings.memory
        : (newSettings.memory[currentProjectName] || '');
      
      if (oldMemory !== newMemory && !location.href.includes(PAGE)) {
        logger.log("Memory update, skipping");
        return;
      }
      
      storage.settings = JSON.parse(JSON.stringify(newSettings));//Deep copy to avoid reference issues
      
      if (!newSettings.renameExistingTabs) {
        if (!storage.settings.alreadyAssessedTabs) storage.settings.alreadyAssessedTabs = {};
        storage.settings.alreadyAssessedTabs[currentProjectName] = props.caido.replay.getSessions().map(session => session.id);
        logger.log("Rename existing tabs is disabled, so adding all sessions to alreadyAssessedTabs", storage.settings.alreadyAssessedTabs[currentProjectName]);
      }else{
        if (!storage.settings.alreadyAssessedTabs) storage.settings.alreadyAssessedTabs = {};
        storage.settings.alreadyAssessedTabs[currentProjectName] = [];
      }
      await setPluginStorage(props.caido, storage);
      props.startRenameInterval(props.caido);
    }, { deep: true });

    const validateApiKey = async (key: string): Promise<boolean> => {
      try {
        logger.log("Validating API key", key);
        logger.log("isDev", isDev);
        if (isDev) {
          tokensUsed.value = 0;
          tokensLimit.value = 10000000;
          return true;
        }
        const response = await fetch(`${props.apiEndpoint}/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
        });
        
        if (response.ok) {
          const data: ValidationResponse = await response.json();
          tokensUsed.value = data.tokens_used;
          tokensLimit.value = data.tokens_limit;
          return data.is_valid;
        }
        return false;
      } catch (error) {
        logger.error('Error validating API key:', error);
        return false;
      }
    };

    const validateAndSave = async (attempted: boolean = true) => {
      validationAttempted.value = attempted;
      const isValid = await validateApiKey(apiKey.value);
      isApiKeyValid.value = isValid;
      if (isValid) {
        validationAttempted.value = true;
        logger.log("Saving API key");
        let storage = await getPluginStorage(props.caido);
        storage.apiKey = apiKey.value;
        await setPluginStorage(props.caido, storage);
        eventBus.setAuthenticated(true);
        emit('authenticated');
      } else {
        eventBus.setAuthenticated(false);
      }
    };

    onMounted(async () => {
      logger.log("Mounted");
      const storage = await getPluginStorage(props.caido);
      logger.log("Storage", storage);
      
      if (storage) {
        if (storage.apiKey) {
          apiKey.value = storage.apiKey;
        }else{
          const fetchedApiKey = await fetchAPIKey();
          if (fetchedApiKey) {
            storage.apiKey = fetchedApiKey;
            apiKey.value = fetchedApiKey;
            await setPluginStorage(props.caido, storage);
          }
        }
        if (storage.settings) {
          settings.value = storage.settings;
        }
      }
      validateAndSave(false);
    });

    return {
      apiKey,
      isApiKeyValid,
      settings,
      memoryForCurrentProject,
      aiInstructionsForCurrentProject,
      tokensUsed,
      tokensLimit,
      validationAttempted,
      validateAndSave,
      PLACEHOLDER_AI_INSTRUCTIONS,
      PLACEHOLDER_MEMORY
    };
  },
});
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto {
  scrollbar-width: thin;
}

/* Custom styles */

/* Textarea focus styling with 1px secondary border */
.textarea-focus {
  border: 1px solid transparent;
  outline: none;
}

.textarea-focus:focus {
  border: 1px solid var(--c-fg-secondary) !important;
  outline: none;
}
</style>