<template>
  <div class="shift-toolbar-component">
    <!-- Show agent control buttons when an agent is active -->
    <div class="agent-buttons-container" v-if="isAgentActive">
      <button 
        class="agent-control-button stop-agent-button"
        @click="stopAgent"
      >
        <span>Stop Agent</span>
        <i class="fas fa-stop"></i>
      </button>
      <button 
        v-if="!isAgentPaused"
        class="agent-control-button pause-agent-button"
        @click="pauseAgent"
      >
        <span>Pause Agent</span>
        <i class="fas fa-pause"></i>
      </button>
      <button 
        v-else
        class="agent-control-button resume-agent-button"
        @click="resumeAgent"
        :disabled="isInCooldown"
      >
        <span v-if="!isInCooldown">Resume Agent</span>
        <span v-else>Cooldown...</span>
        <i class="fas fa-play"></i>
      </button>
      <button 
        class="agent-control-button reset-agent-button"
        @click="resetAgent"
      >
        <span>Reset Agent</span>
        <i class="fas fa-redo"></i>
      </button>
    </div>
    
    <!-- Show agent dropdown when no agent is active -->
    <div class="agent-dropdown-container" v-else-if="agents.length > 0">
      <button 
        ref="dropdownButton"
        @click="toggleDropdown"
      >
        <span>Delegate to Agent</span>
        <i class="fas fa-caret-down"></i>
      </button>
    </div>
    
    <!-- Fallback when no agents are available -->
    <div class="agent-dropdown-container" v-else>
      <button 
        @click="navigateToShift"
        class="greyed-out-button"
      >
        <span>Add Shift Agents</span>
        <i class="fas fa-plus"></i>
      </button>
    </div>
  </div>
  
  <teleport to="body">
    <div 
      v-if="isDropdownOpen" 
      class="agent-dropdown-backdrop" 
      @click="isDropdownOpen = false"
    ></div>
    
    <div 
      v-if="isDropdownOpen" 
      class="agent-dropdown-menu" 
      :style="dropdownStyle"
    >
      <div 
        v-for="agent in agents" 
        :key="agent.id" 
        class="agent-dropdown-item"
        @click="openLaunchModal(agent)"
      >
        {{ agent.name }}
      </div>
    </div>
    
    <!-- Agent Launch Modal -->
    <AgentLaunchModal
      :agent="selectedAgent"
      :isVisible="isLaunchModalOpen"
      :previousConfig="previousConfig"
      @close="closeLaunchModal"
      @launch="handleAgentLaunch"
    />
  </teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import type { Caido } from "@caido/sdk-frontend";
import { getPluginStorage, setPluginStorage } from "../../utils/caidoUtils";
import logger from '@/utils/logger';
import AgentLaunchModal from '../AgentLaunchModal/AgentLaunchModal.vue';
import { AgentTabAssociation, AgentState } from '../../constants';
import { generateId } from '../../utils/utils';

// Declare the shiftAgentCooldown property on the Window interface
declare global {
  interface Window {
    shiftAgentCooldown?: Record<string, number>;
  }
}

// Define props
const props = defineProps<{
  caido: Caido;
  apiEndpoint: string;
  toolbarState: { sessionId: string | null };
}>();

// Refs and state
const dropdownButton = ref<HTMLElement | null>(null);
const agents = ref<Array<{id: string, name: string, instructions: string, knowledge: Array<string>, dynamicFields?: Array<any>}>>([]);
const isDropdownOpen = ref(false);
const isAgentActive = ref(false);
const isAgentPaused = ref(false);
const dropdownStyle = ref({
  top: '0px',
  left: '0px',
  minWidth: '0px',
  display: 'none'
});


// Launch modal state
const isLaunchModalOpen = ref(false);
const selectedAgent = ref<{id: string, name: string, instructions: string, knowledge: Array<string>, dynamicFields?: Array<any>} | null>(null);
const previousConfig = ref<{jitInstructions: string, maxRequests: number, dynamicValues: Record<string, any>} | null>(null);
const currentTime = ref(Date.now());
let timeInterval: number;
// Add this computed property after other refs and before functions
const isInCooldown = computed(() => {
  if (!props.toolbarState.sessionId || !window.shiftAgentCooldown?.[props.toolbarState.sessionId]) {
    return false;
  }
  return currentTime.value < window.shiftAgentCooldown[props.toolbarState.sessionId];
});

// Function to navigate to Shift page
const navigateToShift = () => {
  window.location.href = '#/shift';
};

// Function to load agents
const loadAgents = async () => {
  try {
    const storage = await getPluginStorage(props.caido);
    agents.value = storage.agents || [];
    console.log('Agents loaded:', agents.value.length);
    
    // Check if there's an active agent for the current session
    await checkForActiveAgent();
  } catch (error) {
    console.error("Error loading agents:", error);
  }
};

// Check if there's an active agent for the current session
const checkForActiveAgent = async () => {
  if (!props.toolbarState.sessionId) return;
  
  try {
    const storage = await getPluginStorage(props.caido);
    const associations = storage.agentTabAssociations || {};
    const association = associations[props.toolbarState.sessionId];
    
    isAgentActive.value = !!association;
    
    // Check if the agent is paused
    if (association && association.agentState === AgentState.Paused) {
      isAgentPaused.value = true;
    } else {
      isAgentPaused.value = false;
    }
    
    logger.log('Agent active state:', isAgentActive.value, 'Agent paused state:', isAgentPaused.value);
  } catch (error) {
    console.error("Error checking for active agent:", error);
  }
};

// Function to pause the agent
const pauseAgent = async (triggerEvent: boolean | MouseEvent = true) => {
  if (!props.toolbarState.sessionId) return;
  
  try {
    // Get current storage to retrieve the agent association
    const storage = await getPluginStorage(props.caido);
    logger.log("Storage in pauseAgent:", storage);
    const associations = storage.agentTabAssociations || {};
    const association = associations[props.toolbarState.sessionId];
    
    if (association) {
      // Update the agent state to paused
      if (!window.shiftAgentCooldown) {
        window.shiftAgentCooldown = {};
      }
      window.shiftAgentCooldown[props.toolbarState.sessionId] = Date.now() + 1000 * 2; // 5 second cooldown

      association.agentState = AgentState.Paused;
      
      // Update storage
      await setPluginStorage(props.caido, {
        agentTabAssociations: associations
      });
      
      // Update local state
      isAgentPaused.value = true;
      
      logger.log('Agent paused for session', props.toolbarState.sessionId);
      
      // Dispatch event to notify other components
      if (triggerEvent === true || triggerEvent instanceof MouseEvent) {
        const event = new CustomEvent('agent-paused', { bubbles: true });
        window.dispatchEvent(event);
      }
    }
  } catch (error) {
    console.error("Error pausing agent:", error);
  }
};

// Function to resume the agent
const resumeAgent = async () => {
  if (!props.toolbarState.sessionId) return;
  
  try {
    // Get current storage to retrieve the agent association
    const storage = await getPluginStorage(props.caido);
    const associations = storage.agentTabAssociations || {};
    const association = associations[props.toolbarState.sessionId];
    
    if (association) {
      // Update the agent state to ready to tell AI (resume from paused)
      association.agentState = AgentState.Restarted;
      
      // Update storage
      await setPluginStorage(props.caido, {
        agentTabAssociations: associations
      });
      
      // Update local state
      isAgentPaused.value = false;
      
      logger.log('Agent resumed for session', props.toolbarState.sessionId);
      
      // Dispatch event to notify other components
      const event = new CustomEvent('agent-resumed', { bubbles: true });
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error("Error resuming agent:", error);
  }
};

// Function to stop the agent
const stopAgent = async (triggerEvent: boolean | MouseEvent = true) => {
  if (!props.toolbarState.sessionId) return;
  
  try {
    // Remove the agent-tab association from storage
    const storage = await getPluginStorage(props.caido);
    const associations = storage.agentTabAssociations || {};
    
    if (associations[props.toolbarState.sessionId]) {
      delete associations[props.toolbarState.sessionId];
     
      if (!window.shiftAgentCooldown) {
        window.shiftAgentCooldown = {};
      }
      window.shiftAgentCooldown[props.toolbarState.sessionId] = Date.now() + 1000 * 2; // 5 second cooldown
      // Update storage
      await setPluginStorage(props.caido, {
        agentTabAssociations: associations
      });
      
      logger.log('Agent-tab association removed for session', props.toolbarState.sessionId);
    }
    
    // Dispatch event to remove the agent component
    if (triggerEvent === true || triggerEvent instanceof MouseEvent) {
      const event = new CustomEvent('agent-stop', { bubbles: true });
      window.dispatchEvent(event);
    }
    
    // Update the UI state
    isAgentActive.value = false;
    isAgentPaused.value = false; // Reset paused state when stopping
  } catch (error) {
    console.error("Error stopping agent:", error);
  }
};

// Function to reset the agent
const resetAgent = async () => {
  if (!props.toolbarState.sessionId) return;
  
  try {
    // Get current storage to retrieve the agent association
    const storage = await getPluginStorage(props.caido);
    const associations = storage.agentTabAssociations || {};
    const association = associations[props.toolbarState.sessionId];
    
    if (association) {
      // Find the agent details
      const agentId = association.agentId;
      const agent = storage.agents.find(a => a.id === agentId);
      
      if (agent) {
        // Store the launch config to reuse
        const launchConfig = association.launchConfig;
        
        // First stop the agent (remove association and UI)
        await stopAgent();
        
        // // Clear conversation history on the backend
        // try {
        //   await fetch(`${props.apiEndpoint}/clear-conversation`, {
        //     method: 'POST',
        //     headers: {
        //       'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //       sessionId: props.toolbarState.sessionId,
        //       agentId: agentId
        //     })
        //   });
        // } catch (error) {
        //   console.error("Error clearing conversation history:", error);
        // }
        
        // Reopen the launch modal with the same agent and config
        selectedAgent.value = agent;
        
        // Pre-populate the launch config in the modal
        if (launchConfig) {
          // Set the previous config
          previousConfig.value = launchConfig;
          
          // Open the modal
          isLaunchModalOpen.value = true;
        } else {
          // Just open the modal if no config
          previousConfig.value = null;
          isLaunchModalOpen.value = true;
        }
      }
    }
  } catch (error) {
    console.error("Error resetting agent:", error);
  }
};

// Handle agent association found event
const handleAgentAssociationFound = () => {
  isAgentActive.value = true;
  logger.log('Agent association found event received');
};

// Handle agent association not found event
const handleAgentAssociationNotFound = () => {
  isAgentActive.value = false;
  logger.log('Agent association not found event received');
};

// Launch modal functions
const openLaunchModal = (agent: any) => {
  selectedAgent.value = agent;
  previousConfig.value = null; // Clear previous config when opening for a new agent
  isLaunchModalOpen.value = true;
  isDropdownOpen.value = false;
};

const closeLaunchModal = () => {
  isLaunchModalOpen.value = false;
  selectedAgent.value = null;
  previousConfig.value = null;
};

const handleAgentLaunch = async (config: any) => {
  logger.log('Agent launch config:', config);
  
  // Get the current session ID
  const sessionId = props.toolbarState.sessionId;
  
  if (sessionId) {
    try {
      // Get current storage
      const storage = await getPluginStorage(props.caido);
      
      // Create a map if it doesn't exist yet
      const agentTabMap = storage.agentTabAssociations || {};
      
      // Update the map with the new association
      const association: AgentTabAssociation = {
        agentId: config.agentId,
        timestamp: Date.now(),
        launchConfig: {
          jitInstructions: config.jitInstructions,
          maxRequests: config.maxRequests,
          dynamicValues: config.dynamicValues
        },
        sessionId: sessionId,
        conversationId: generateId(),
        conversationHistory: [{
          id: generateId(),
          role: 'user',
          content: 'Agent started:\n\n' + config.jitInstructions,
          action: [],
          timestamp: Date.now()
        }],
        agentState: AgentState.ReadyToTellAI
      };
      
      agentTabMap[sessionId] = association;
      
      // Update storage
      await setPluginStorage(props.caido, {
        agentTabAssociations: agentTabMap
      });
      
      logger.log(`Agent-tab association saved with session ${sessionId}`);
    } catch (error) {
      console.error("Error saving agent-tab association:", error);
    }
  } else {
    console.warn("No session ID available, cannot save agent-tab association");
  }
  
  // Dispatch a custom event that can be listened to by other components
  const event = new CustomEvent('agent-selected', { 
    detail: selectedAgent.value,
    bubbles: true 
  });
  window.dispatchEvent(event);
};

// Lifecycle hooks
onMounted(() => {
  // Load agents
  loadAgents();
  
  // Add window resize listener
  window.addEventListener('resize', updateDropdownPosition);
  
  // Add visibility change listener to refresh agents when tab becomes visible
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Add hash change listener to refresh agents when navigating back to the page
  window.addEventListener('hashchange', handleHashChange);
  
  // Add event listener for agent selection
  window.addEventListener('agent-selected', handleAgentSelected);
  
  // Add event listener for agent stop
  window.addEventListener('agent-stop', handleAgentStopped);
  
  // Add event listeners for agent association events
  window.addEventListener('agent-association-found', handleAgentAssociationFound);
  window.addEventListener('agent-association-not-found', handleAgentAssociationNotFound);
  
  // Add event listener for agent paused
  window.addEventListener('agent-paused', handleAgentPaused);
  
  // Add event listener for agent resumed
  window.addEventListener('agent-resumed', handleAgentResumed);

  // Add interval to update currentTime every 100ms
  timeInterval = window.setInterval(() => {
    currentTime.value = Date.now();
  }, 250);
  
  logger.log("ToolbarComponent mounted");
});

onUnmounted(() => {
  logger.log('ToolbarComponent unmounted');
  window.removeEventListener('resize', updateDropdownPosition);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('hashchange', handleHashChange);
  window.removeEventListener('agent-selected', handleAgentSelected);
  window.removeEventListener('agent-stop', handleAgentStopped);
  window.removeEventListener('agent-association-found', handleAgentAssociationFound);
  window.removeEventListener('agent-association-not-found', handleAgentAssociationNotFound);
  window.removeEventListener('agent-paused', handleAgentPaused);
  window.removeEventListener('agent-resumed', handleAgentResumed);
  window.clearInterval(timeInterval);
});

// Handle agent selection
const handleAgentSelected = () => {
  isAgentActive.value = true;
};

// Handle agent stopped
const handleAgentStopped = async () => {
  isAgentActive.value = false;
  await stopAgent(false as boolean);
};

// Handle agent paused
const handleAgentPaused = () => {
  // The agent is still active when paused, so we don't change isAgentActive
  isAgentPaused.value = true;
  pauseAgent(false);
  logger.log('Agent paused event received');
};

// Handle agent resumed
const handleAgentResumed = () => {
  isAgentPaused.value = false;
  logger.log('Agent resumed event received');
};

// Watch for changes in the toolbar state (tab changes)
watch(() => props.toolbarState.sessionId, (newSessionId, oldSessionId) => {
  logger.log('watch toolbarState.sessionId', newSessionId, oldSessionId);
  if (newSessionId !== oldSessionId) {
    // Refresh agents when tab changes
    loadAgents();
  }
});

// Handle visibility change (when user switches back to the tab)
const handleVisibilityChange = () => {
  logger.log('handleVisibilityChange', document.visibilityState);
  if (document.visibilityState === 'visible') {
    loadAgents();
  }
};

// Handle hash change (when user navigates back to the page)
const handleHashChange = () => {
  logger.log('handleHashChange', window.location.hash);
  // Check if we're on the replay page
  if (window.location.hash.startsWith('#/replay')) {
    loadAgents();
  }
};

// Update dropdown position
const updateDropdownPosition = () => {
  if (!dropdownButton.value) return;
  
  const rect = dropdownButton.value.getBoundingClientRect();
  
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
    display: 'block'
  };
};

// Toggle dropdown
const toggleDropdown = (event: Event) => {
  event.stopPropagation();
  
  if (!isDropdownOpen.value) {
    // Opening the dropdown
    isDropdownOpen.value = true;
    nextTick(() => {
      updateDropdownPosition();
    });
  } else {
    // Closing the dropdown
    isDropdownOpen.value = false;
  }
};
</script>

<style>
/* Styles are defined in the "globalStyles.css" file */
</style> 