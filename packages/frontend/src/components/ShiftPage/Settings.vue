<template>
  <div class="shift-ui-container">
    <div class="input-group">
      <div class="input-header">
        <strong>API Key</strong>
      </div>
      <div class="input-wrapper">
        <input 
          type="password" 
          id="apiKey" 
          v-model="apiKey"
        />
        <span v-if="validationAttempted" class="validation-icon" :class="{ 'valid': isApiKeyValid, 'invalid': !isApiKeyValid }">
          {{ isApiKeyValid ? '✓' : '✗' }}
        </span>
        <button class="validate-button" @click="(e: MouseEvent) => validateAndSave()">Validate</button>
      </div>
      <div class="beta-message">Shift is currently in closed beta. To get a key, please sign up at <a href="https://shiftwaitlist.com" target="_blank" style="text-decoration: underline; color: var(--c-fg-secondary)">shiftwaitlist.com</a>.</div>
    </div>
    
    <div v-if="validationAttempted && tokensUsed !== null && tokensLimit !== null" class="usage-container">
      <div class="usage-label">Usage:</div>
      <div class="usage-info">
        <div class="usage-bar">
          <div 
            class="usage-progress" 
            :style="{ width: `${(tokensUsed / tokensLimit) * 100}%` }"
            :class="{ 'invalid': !isApiKeyValid }"
          ></div>
        </div>
        <div class="usage-text">
          {{ tokensUsed?.toLocaleString() || 0 }} / {{ tokensLimit?.toLocaleString() || 0 }} tokens
          <span v-if="!isApiKeyValid" class="invalid-key-message">(Invalid API Key)</span>
        </div>
      </div>
    </div>
    <div class="settings-section" :class="{ 'disabled-section': !isApiKeyValid }">
      <div class="setting-row">
        <input
          type="checkbox"
          v-model="settings.aiRenameReplayTabs"
          id="aiRenameReplayTabs"
          :disabled="!isApiKeyValid"
        />
        <label for="aiRenameReplayTabs" :class="{ 'disabled-text': !isApiKeyValid }">
          <strong>&nbsp;AI Rename Replay Tabs</strong> - Note: This will only rename tabs that have not been renamed yet.
        </label>
      </div>

      <div v-if="settings.aiRenameReplayTabs" class="setting-subsection">
        <div class="setting-row column">
          <label for="renameDelay" :class="{ 'disabled-text': !isApiKeyValid }">Rename after X Seconds:</label>
          <div class="numeric-input">
            <input
              type="number"
              v-model.number="settings.renameDelay"
              id="renameDelay"
              :disabled="!isApiKeyValid"
            />
          </div>
        </div>
        <div class="setting-row">
          <input
            type="checkbox"
            v-model="settings.renameExistingTabs"
            id="renameExistingTabs"
            :disabled="!isApiKeyValid"
          />
          <label for="renameExistingTabs" :class="{ 'disabled-text': !isApiKeyValid }">
            <strong>&nbsp;Rename Existing Replay Tabs (Use only if you want all tabs to be renamed)</strong>
          </label>
        </div>
        <div class="setting-row column">
          <label for="renameInstructions" :class="{ 'disabled-text': !isApiKeyValid }">Rename Instructions:</label>
          <textarea
            v-model="settings.renameInstructions"
            id="renameInstructions"
            rows="3"
            :disabled="!isApiKeyValid"
          ></textarea>
        </div>

      </div>
    </div>
    <div class="settings-section" :class="{ 'disabled-section': !isApiKeyValid }">
      <div class="setting-row column">
        <label for="memory" :class="{ 'disabled-text': !isApiKeyValid }">
          <strong>Memory</strong> - Free-form notes for the AI to use. You can store details about the target app, IDs for certain objects or accounts, etc, and the AI will use them when making decisions or filling in data.
        </label>
        <textarea
          v-model="settings.memory"
          id="memory"
          rows="5"
          :placeholder="PLACEHOLDER_MEMORY"
          :disabled="!isApiKeyValid"
        ></textarea>
      </div>
    </div>
    <div class="settings-section" :class="{ 'disabled-section': !isApiKeyValid }">
      <div class="setting-row column">
        <label for="aiInstructions" :class="{ 'disabled-text': !isApiKeyValid }">
          <strong>AI Instructions</strong> - Define shortcuts and special instructions for the AI to follow. You can create custom commands or specify how you want the AI to interpret certain patterns.
        </label>
        <textarea
          v-model="settings.aiInstructions"
          id="aiInstructions"
          rows="5"
          :placeholder="PLACEHOLDER_AI_INSTRUCTIONS"
          :disabled="!isApiKeyValid"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import type { Caido } from "@caido/sdk-frontend";
import { getCurrentProjectName, getPluginStorage, setPluginStorage } from '../../utils/caidoUtils';
import { isDev, PAGE, PluginStorage, DEFAULT_PLUGIN_STORAGE, PLACEHOLDER_AI_INSTRUCTIONS, PLACEHOLDER_MEMORY} from '../../constants';
import logger from "../../utils/logger";
import { eventBus } from '../../utils/eventBus'

interface ValidationResponse {
  is_valid: boolean;
  tokens_used: number;
  tokens_limit: number;
}

export default defineComponent({
  name: 'ShiftUIComponent',
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
  setup(props){
    const apiKey = ref('');
    const isApiKeyValid = ref(false);
    const tokensUsed = ref<number | null>(null);
    const tokensLimit = ref<number | null>(null);
    const validationAttempted = ref(false);

    const settings = ref<PluginStorage['settings']>(DEFAULT_PLUGIN_STORAGE.settings);

    watch(props.updateMemory, async (newVal) => {
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

    watch(settings, async (newSettings) => {
      logger.log("settings updated", settings.value, newSettings);
      let storage = await getPluginStorage(props.caido);
      if (storage.settings?.memory != newSettings?.memory && !location.href.includes(PAGE)) {
        logger.log("Memory update, skipping");
        return;
      }
      storage.settings = JSON.parse(JSON.stringify(newSettings));//Deep copy to avoid reference issues
      let projectName = getCurrentProjectName();
      if (!newSettings.renameExistingTabs) {
        if (!storage.settings.alreadyAssessedTabs) storage.settings.alreadyAssessedTabs = {};
        storage.settings.alreadyAssessedTabs[projectName] = props.caido.replay.getSessions().map(session => session.id);
        logger.log("Rename existing tabs is disabled, so adding all sessions to alreadyAssessedTabs", storage.settings.alreadyAssessedTabs[projectName]);
      }else{
        if (!storage.settings.alreadyAssessedTabs) storage.settings.alreadyAssessedTabs = {};
        storage.settings.alreadyAssessedTabs[projectName] = [];
      }
      await setPluginStorage(props.caido, storage);
      props.startRenameInterval(props.caido);
    }, { deep: true });

    const incrementRenameDelay = () => {
      settings.value.renameDelay++;
    };

    const decrementRenameDelay = () => {
      settings.value.renameDelay--;
    };

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
      tokensUsed,
      tokensLimit,
      validationAttempted,
      validateAndSave,
      settings,
      incrementRenameDelay,
      decrementRenameDelay,
      PLACEHOLDER_AI_INSTRUCTIONS,
      PLACEHOLDER_MEMORY
    };
  },
});
</script>

<style scoped>
.shift-ui-container {
  padding: 20px;
  font-family: Arial, sans-serif;
  margin: 0;
  height: calc(100vh - 100px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.shift-ui-container::-webkit-scrollbar {
  width: 8px;
}

.centered-content {
  text-align: center; /* Center only the h2 */
}

.input-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}

.input-header {
  margin-bottom: 10px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 400px;
  margin-right: 10px;
}

input{
  width: 100%;
  background: transparent;
  outline: 0;
  box-sizing: border-box;
  line-height: inherit;
  border: 1px solid var(--c-border-default);
  border-radius: 10px;
  color: white;
}

input[type="password"] {
  width: 100%;
  padding: 5px;
  padding-right: 30px;
  box-sizing: border-box; /* Include padding in the width calculation */
}

.validation-icon {
  position: absolute;
  right: 120px;
  font-size: 18px;
}

.validation-icon.valid {
  color: green;
}

.validation-icon.invalid {
  color: red;
}

button {
  padding: 10px 15px;
  background-color: var(--c-fg-primary);
  color: white;
  border: none;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.result {
  margin-top: 20px;
}

pre {
  background-color: #f4f4f4;
  padding: 10px;
  overflow-x: auto;
}

.usage-container {
  margin-top: 20px;
  width: 300px;
}

.usage-label {
  color: white;
  margin-bottom: 5px;
}

.usage-info {
  width: 100%;
}

.usage-bar {
  height: 10px;
  background-color: #333;
  border-radius: 5px;
  overflow: hidden;
}

.usage-progress {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.usage-text {
  font-size: 0.9em;
  color: white;
  text-align: right;
  margin-top: 5px;
}

.usage-progress.invalid {
  background-color: #ff4444;
}

.invalid-key-message {
  color: #ff4444;
  margin-left: 5px;
}

 .validate-button {
  padding: 0px 15px;
  background-color: var(--c-fg-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  height: 28px;
  width: fit-content;
  margin-left: 10px;
}

.validate-button:active{
  background-color: var(--c-fg-primary-pressed);
}

.setting-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.setting-subsection {
  margin-left: 20px;
  margin-top: 8px;
}

.numeric-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.numeric-input button {
  padding: 2px 8px;
  cursor: pointer;
}

.numeric-input input {
  width: 60px;
  text-align: center;
}

textarea {
  width: 100%;
  resize: vertical;
  min-height: 60px;
  padding: 8px;
}

.setting-row.column {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

textarea {
  border-radius: 4px;
  background-color: var(--c-bg-default);
  border: 1px solid var(--c-border-default);
  color: white;
}

textarea:focus, input:focus {
  outline: 1px solid var(--c-fg-secondary);
}

.numeric-input input {
  border-radius: 4px;
}
.settings-section{
  border-top:3px solid var(--c-fg-secondary);
  margin: 1em 0;
  padding: 1em 0;
}

input[type="checkbox"] {
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 1.15em;
  height: 1.15em;
  border: .1em solid grey;
  border-radius: 4px;
  display: inline-grid;
  place-content: center;
  margin: 0;
}

/* Add a checkmark when checked */
input[type="checkbox"]::before {
  content: "";
  width: 0.65em;
  height: 0.65em;
  transform: scale(0);
  transition: 120ms transform ease-in-out;
  box-shadow: inset 1em 1em var(--c-fg-primary);
  transform-origin: center;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
}

input[type="checkbox"]:checked::before {
  transform: scale(1);
}

textarea#memory {
  width: 100%;
  min-height: 100px;
  font-family: monospace;
  white-space: pre;
  resize: vertical;
}

.disabled-section {
  opacity: 0.6;
  pointer-events: none;
}

.disabled-text {
  color: var(--c-fg-disabled, #666);
}

input:disabled, textarea:disabled {
  background-color: var(--c-bg-disabled, #333);
  color: var(--c-fg-disabled, #666);
  cursor: not-allowed;
}

input[type="checkbox"]:disabled {
  border-color: var(--c-border-disabled, #444);
  background-color: var(--c-bg-disabled, #333);
}

textarea#aiInstructions {
  width: 100%;
  min-height: 100px;
  font-family: monospace;
  white-space: pre;
  resize: vertical;
}

.model-selector {
  margin-top: 15px;
  width: 300px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-selector select {
  flex: 1;
  padding: 5px;
  border-radius: 4px;
  background-color: var(--c-bg-default);
  border: 1px solid var(--c-border-default);
  color: white;
}

.model-selector select:disabled {
  background-color: var(--c-bg-disabled, #333);
  color: var(--c-fg-disabled, #666);
  cursor: not-allowed;
}

.model-selector label {
  min-width: 50px;
}

.beta-message {
  margin-top: 10px;
  font-size: 0.8em;
}
</style>