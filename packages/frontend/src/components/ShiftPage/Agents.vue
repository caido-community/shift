<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { FrontendSDK } from "@/types";
import { getPluginStorage, setPluginStorage } from "../../utils/caidoUtils";
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import FileUpload from 'primevue/fileupload';
import Tag from 'primevue/tag';

// Define props
const props = defineProps<{
  caido: FrontendSDK;
  apiEndpoint: string;
  startRenameInterval: () => void;
  updateMemory: boolean;
}>();

// State for agents
const agents = ref<Array<{id: string, name: string}>>([]);
const selectedAgent = ref<{id: string, name: string, instructions: string, knowledge: Array<string>} | null>(null);
const newName = ref('');
const newInstructions = ref('');

// Load agents on mount
onMounted(async () => {
  try {
    const storage = await getPluginStorage(props.caido);
    agents.value = storage.agents || [];

    // Default to selecting the first agent in the list
    if (agents.value.length > 0) {
      const firstAgent = agents.value[0];
      if (firstAgent) {
        selectAgent(firstAgent);
      }
    }
  } catch (error) {
    console.error("Error loading agents:", error);
  }
});

// Select an agent from the list
const selectAgent = async (agent: {id: string, name: string}) => {
  try {
    const storage = await getPluginStorage(props.caido);
    const agentDetails = storage.agents.find(a => a.id === agent.id);

    if (agentDetails) {
      selectedAgent.value = agentDetails;
      newName.value = agentDetails.name;
      newInstructions.value = agentDetails.instructions;
    }
  } catch (error) {
    console.error("Error selecting agent:", error);
  }
};

// Create a new agent
const createNewAgent = () => {
  selectedAgent.value = {
    id: 'new',
    name: 'New Agent',
    instructions: '',
    knowledge: []
  };
  newName.value = 'New Agent';
  newInstructions.value = '';
};

// Save the current agent
const saveAgent = async () => {
  if (!selectedAgent.value) return;

  const agent = selectedAgent.value as {id: string, name: string, instructions: string, knowledge: Array<string>};

  try {
    const storage = await getPluginStorage(props.caido);

    // Update the agent with new values
    agent.name = newName.value;
    agent.instructions = newInstructions.value;

    // Check if this is a new agent or an existing one
    if (agent.id === 'new') {
      // Generate a new ID for the agent
      agent.id = Date.now().toString();
      storage.agents.push(agent);
    } else {
      // Update existing agent
      const index = storage.agents.findIndex(a => a.id === agent.id);
      if (index >= 0) {
        storage.agents[index] = agent;
      }
    }

    // Save to storage
    await setPluginStorage(props.caido, { agents: storage.agents });

    // Update local list
    agents.value = storage.agents.map(a => ({ id: a.id, name: a.name }));

  } catch (error) {
    console.error("Error saving agent:", error);
  }
};

// Delete the current agent
const deleteAgent = async () => {
  if (!selectedAgent.value) return;

  try {
    const storage = await getPluginStorage(props.caido);

    // Remove the agent from storage
    storage.agents = storage.agents.filter(a => a.id !== selectedAgent.value?.id);

    // Save to storage
    await setPluginStorage(props.caido, { agents: storage.agents });

    // Update local list
    agents.value = storage.agents.map(a => ({ id: a.id, name: a.name }));

    // Clear selection
    selectedAgent.value = null;
    newName.value = '';
    newInstructions.value = '';

  } catch (error) {
    console.error("Error deleting agent:", error);
  }
};

// Handle file upload
const onFileUpload = async (event: any) => {
  if (!selectedAgent.value) return;

  try {
    const storage = await getPluginStorage(props.caido);
    const files = event.files;

    // Process uploaded files
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target || !e.target.result) return;

        const filename = file.name;

        // Find the agent in storage
        const agentIndex = storage.agents.findIndex(a => a.id === selectedAgent.value?.id);
        if (agentIndex >= 0 && storage.agents[agentIndex]) {
          const agent = storage.agents[agentIndex];
          // Add the file to the agent's knowledge
          if (!agent.knowledge.includes(filename)) {
            agent.knowledge.push(filename);

            // Update the selected agent
            if (selectedAgent.value) {
              selectedAgent.value.knowledge.push(filename);
            }

            // Save to storage
            await setPluginStorage(props.caido, { agents: storage.agents });
          }
        }
      };
      reader.readAsText(file);
    }

    // Clear the file upload
    event.clear();
  } catch (error) {
    console.error("Error uploading files:", error);
  }
};

// Remove a knowledge file
const removeKnowledgeFile = async (filename: string) => {
  if (!selectedAgent.value) return;

  try {
    const storage = await getPluginStorage(props.caido);

    // Find the agent in storage
    const agentIndex = storage.agents.findIndex(a => a.id === selectedAgent.value?.id);
    if (agentIndex >= 0 && storage.agents[agentIndex]) {
      const agent = storage.agents[agentIndex];
      // Remove the file from the agent's knowledge
      agent.knowledge = agent.knowledge.filter(f => f !== filename);

      // Update the selected agent
      if (selectedAgent.value) {
        selectedAgent.value.knowledge = selectedAgent.value.knowledge.filter(f => f !== filename);
      }

      // Save to storage
      await setPluginStorage(props.caido, { agents: storage.agents });
    }
  } catch (error) {
    console.error("Error removing knowledge file:", error);
  }
};
</script>

<template>
  <div class="shift-ui-container">
    <!-- Header section similar to Settings.vue -->
    <div class="input-group">
      <div class="input-header">
        <strong>Agents</strong>
      </div>
    </div>

    <div class="agents-content gap-1">
      <!-- Left sidebar - Agent list (20%) -->
      <div class="agent-list">
        <div class="agent-item add-agent" @click="createNewAgent">
          <div class="agent-item-content">
            <i class="pi pi-plus"></i>
            <span>Add New Agent</span>
          </div>
        </div>

        <div
          v-for="agent in agents"
          :key="agent.id"
          class="agent-item"
          :class="{ 'selected': selectedAgent?.id === agent.id }"
          @click="selectAgent(agent)"
        >
          <div class="agent-item-content">
            <i class="pi pi-user-edit"></i>
            <span>{{ agent.name }}</span>
          </div>
        </div>
      </div>

      <!-- Right content area - Agent details (80%) -->
      <div class="agent-details">
        <div v-if="selectedAgent" class="agent-form">
          <div class="form-group">
            <label for="agent-name">Name</label>
            <InputText id="agent-name" v-model="newName" class="w-full" />
          </div>

          <div class="form-group">
            <label for="agent-instructions">System Prompt</label>
            <Textarea
              id="agent-instructions"
              v-model="newInstructions"
              rows="18"
              class="w-full"
              placeholder="Enter instructions for this agent..."
            />
          </div>

          <div class="form-group disabled-section">
            <div class="coming-soon-header">
              <label>Knowledge</label>
              <Tag value="Coming Soon" severity="info" />
            </div>
            <FileUpload
              mode="advanced"
              :multiple="true"
              accept=".md,.txt"
              :maxFileSize="10000000"
              @upload="onFileUpload"
              :auto="true"
              chooseLabel="Add Files"
              class="w-full"
              disabled
            />

            <div v-if="selectedAgent.knowledge.length > 0" class="knowledge-files">
              <div v-for="(file, index) in selectedAgent.knowledge" :key="index" class="knowledge-file">
                <span>{{ file }}</span>
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  @click="removeKnowledgeFile(file)"
                  disabled
                />
              </div>
            </div>
          </div>

          <div class="form-actions">
            <Button
              label="Delete"
              severity="danger"
              @click="deleteAgent"
              class="p-button-outlined"
            />
            <Button
              label="Save"
              @click="saveAgent"
            />
          </div>
        </div>

        <div v-else class="no-agent-selected">
          <p>Select an agent from the list or create a new one</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shift-ui-container {
  padding: 20px;
  font-family: Arial, sans-serif;
  margin: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shift-ui-container::-webkit-scrollbar {
  width: 8px;
}

.input-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.input-header {
  margin-bottom: 10px;
}

.agents-content {
  display: flex;
  flex: 1;
  min-height: 0; /* Important for flex child to respect parent's height */
  overflow: hidden;
  background-color: var(--c-bg-default);
  border-radius: 10px;

}

.agent-list {
  width: calc(20% - 2px);
  padding: 0.5rem;
  overflow-y: auto;
  height: 100%;
}

.agent-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.agent-item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.agent-item:hover {
  background-color: rgba(60, 60, 60, 0.8);
}

.agent-item.selected {
  background-color: rgba(80, 80, 80, 0.8);
  border-color: rgba(255, 255, 255, 0.3);
}

.add-agent {
  background-color: rgba(40, 40, 40, 0.8);
  border-style: dashed;
}

.agent-details {
  width: calc(80% - 2px);
  border-left: 2px solid var(--c-bg-subtle);
  padding: 1.5rem;
  overflow-y: auto;
  height: 100%;
}

.agent-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--c-text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.knowledge-files {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.knowledge-file {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: rgba(50, 50, 50, 0.8);
  border-radius: 4px;
}

.no-agent-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--c-text-secondary);
}

.disabled-section {
  opacity: 0.6;
  pointer-events: none;
  position: relative;
}

.coming-soon-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

:deep(.p-tag) {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

:deep(.p-fileupload) {
  background-color: rgba(50, 50, 50, 0.5);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.p-inputtext),
:deep(.p-textarea) {
  background-color: rgba(50, 50, 50, 0.5);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--c-text-primary);
}

:deep(.p-button) {
  background-color: rgba(60, 60, 60, 0.8);
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.p-button:hover) {
  background-color: rgba(80, 80, 80, 0.8);
}

:deep(.p-button.p-button-outlined) {
  background-color: transparent;
}

input, textarea {
  border-radius: 4px;
  background-color: var(--c-bg-default);
  border: 1px solid var(--c-border-default);
  color: white;
}

input:focus, textarea:focus {
  outline: 1px solid var(--c-fg-secondary);
}
</style>
