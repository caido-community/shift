<template>
  <!-- This component uses styles from globalStyles.css -->
  <div v-if="activeAgent" class="shift-agent-card">
    <div class="shift-agent-card-header">
      <div class="shift-agent-header-label">
        Shift Agent - {{ activeAgent.name }}
      </div>
      <div class="shift-agent-header-actions">
        <button class="shift-agent-close-btn" @click="detachAgent">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="shift-agent-card-body">
      <div class="shift-agent-conversation">
        <div v-if="messages.length === 0" class="shift-agent-empty-state">
          <div v-if="launchConfig?.jitInstructions" class="shift-agent-instructions">
            <h3>Instructions:</h3>
            <p>{{ launchConfig.jitInstructions }}</p>
          </div>
          <div v-else>
            Select an action to begin working with {{ activeAgent.name }}
          </div>
        </div>
        <div v-else 
             class="shift-agent-messages" 
             ref="messagesContainer"
             @scroll="handleScroll">
          <div v-for="message in messages" :key="message.id">
            <div :class="['shift-agent-message', `shift-agent-message-${message.role}`]">
              <div class="shift-agent-message-content">{{ message.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="shift-agent-card-footer">
      <div class="shift-agent-input">
        <textarea 
          v-model="userInput" 
          placeholder="Type a message to the agent..." 
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { getPluginStorage, setPluginStorage } from "../../utils/caidoUtils";
import logger from '@/utils/logger';
import { getCurrentSessionId } from "../../utils/toolbarInjection";
import { AgentTabAssociation, Message, AgentState } from '../../constants';
import type { Caido } from "@caido/sdk-frontend";
// Native UUID generation function
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Props
const props = defineProps<{
  caido: Caido;
  apiEndpoint: string;
}>();

// State
const activeAgent = ref<{id: string, name: string, instructions: string} | null>(null);
const userInput = ref('');
const messages = ref<Message[]>([]);
const currentSessionId = ref('');
const launchConfig = ref<{
  jitInstructions: string;
  maxRequests: number;
  dynamicValues: Record<string, any>;
} | null>(null);
const requestCount = ref(0);
const messagesContainer = ref<HTMLElement | null>(null);
const shouldAutoScroll = ref(true);

// Methods
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const handleScroll = () => {
  if (messagesContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
    shouldAutoScroll.value = isAtBottom;
  }
};

// Watch for changes in messages
watch(messages, () => {
  if (shouldAutoScroll.value) {
    nextTick(() => {
      scrollToBottom();
    });
  }
});

const sendMessage = async () => {
  if (!userInput.value.trim() || !activeAgent.value) return;
  
  // Check if we've reached the max requests limit
  if (launchConfig.value && requestCount.value >= launchConfig.value.maxRequests) {
    messages.value.push({
      id: generateUUID(),
      role: 'agent',
      content: `Maximum number of requests (${launchConfig.value.maxRequests}) reached. Please detach and reattach the agent to continue.`,
      action: [],
      timestamp: Date.now()
    });
    return;
  }
  
  // Add user message to conversation
  messages.value.push({
    id: generateUUID(),
    role: 'user',
    content: userInput.value,
    action: [],
    timestamp: Date.now()
  });
  
  const messageToSend = userInput.value;
  userInput.value = '';
  
  try {
    // Increment request count
    requestCount.value++;
    
    // Send to API
    const response = await fetch(`${props.apiEndpoint}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId: activeAgent.value.id,
        message: messageToSend,
        sessionId: currentSessionId.value,
        launchConfig: launchConfig.value
      })
    });
    
    if (response.ok) {
      const data = await response.json();
    } else {
      console.error('Error sending message to agent');
    }
  } catch (error) {
    console.error('Error in agent communication:', error);
  }
};

// Save conversation history to storage
const saveConversationHistory = async () => { if (!currentSessionId.value || !activeAgent.value) return;
  
  try {
    // Save to API
    // await fetch(`${props.apiEndpoint}/save-conversation`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     sessionId: currentSessionId.value,
    //     agentId: activeAgent.value.id,
    //     messages: messages.value,
    //     requestCount: requestCount.value
    //   })
    // });
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
};

// Update current session ID
const updateCurrentSessionId = () => {
  const newSessionId = getCurrentSessionId();
  
  if (newSessionId !== currentSessionId.value) {
    currentSessionId.value = newSessionId || '';
    checkForAssociatedAgent();
  }
};

// Check if current tab has an associated agent
const checkForAssociatedAgent = async () => {
  logger.log('checkForAssociatedAgent', currentSessionId.value);
  if (!currentSessionId.value) {
    activeAgent.value = null;
    return;
  }
  
  try {
    logger.log('Getting plugin storage');
    const storage = await getPluginStorage(props.caido);
    const associations = storage.agentTabAssociations || {};
    logger.log('Looking for association with session ID:', currentSessionId.value);
    const association = associations[currentSessionId.value] as AgentTabAssociation | undefined;
    
    if (association) {
      logger.log('Found association:', association);
      // Find the agent details
      const agents = storage.agents || [];
      logger.log('Looking for agent with ID:', association.agentId);
      const agent = agents.find(a => a.id === association.agentId);
      
      if (agent) {
        logger.log('Found agent:', agent);
        activeAgent.value = agent;
        
        // Set launch config if available
        if (association.launchConfig) {
          launchConfig.value = association.launchConfig;
          logger.log('Launch config:', launchConfig.value);
        } else {
          launchConfig.value = null;
        }
      } else {
        logger.log('Agent not found, clearing active agent');
        activeAgent.value = null;
        launchConfig.value = null;
      }
    } else {
      logger.log('No association found, clearing active agent');
      activeAgent.value = null;
      launchConfig.value = null;
    }
  } catch (error) {
    logger.error('Error checking for associated agent:', error);
  }
};

// Detach agent from current tab
const detachAgent = async () => {
  if (!currentSessionId.value) return;
  
  try {
    const storage = await getPluginStorage(props.caido);
    const associations = storage.agentTabAssociations || {};
    
    // Remove the association by creating a new object without the current session ID
    const updatedAssociations = { ...associations };
    delete updatedAssociations[currentSessionId.value];
    if (!window.shiftAgentCooldown) {
      window.shiftAgentCooldown = {};
    }
    window.shiftAgentCooldown[currentSessionId.value] = Date.now() + 1000 * 2; // 5 second cooldown
    
    // Update storage
    await setPluginStorage(props.caido, {
      agentTabAssociations: updatedAssociations
    });
    
    // Update UI
    activeAgent.value = null;
    messages.value = [];
    launchConfig.value = null;
    requestCount.value = 0;
    
    // Dispatch event to update toolbar UI
    window.dispatchEvent(new CustomEvent('agent-stop'));
  } catch (error) {
    console.error('Error detaching agent:', error);
  }
};

// Setup event listeners and observers
let tabObserver: MutationObserver | null = null;


async function handleStorageChange(storage: any) {
  logger.log("handleStorageChange Called on "+currentSessionId.value);
  logger.log("hsc storage", storage);
  if (storage.agentTabAssociations && storage.agentTabAssociations[currentSessionId.value]) {
    logger.log("Triggering handleStorageChange for storage in ReplayShiftAgentComponent");
    let history = storage.agentTabAssociations[currentSessionId.value].conversationHistory;
    if (history.length > messages.value.length) {
      // Check if the last message is a halting message
      let sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
      const lastMessage = sortedHistory[sortedHistory.length - 1];
      if (lastMessage?.halting) {
        const association = storage.agentTabAssociations?.[currentSessionId.value];
        
        if (association) {
          
          // Update the last message to be non-halting after handling the halt
          lastMessage.halting = false;

          if (!window.shiftAgentCooldown) {
            window.shiftAgentCooldown = {};
          }
          window.shiftAgentCooldown[currentSessionId.value] = Date.now() + 1000 * 2; // 5 second cooldown
          
          association.agentState = AgentState.Paused;
          association.conversationHistory.push({
            id: generateUUID(),
            role: 'agent',
            content: `Agent paused`,
            action: [],
            timestamp: Date.now()
          })
          history = association.conversationHistory;
          logger.log("Storage in ReplayShiftAgentComponent before pausing agent:", storage);
          await setPluginStorage(props.caido, storage);
          window.dispatchEvent(new CustomEvent('agent-paused', { bubbles: true }));
        }
      }
      logger.log("settings messages to", sortedHistory);
      logger.log("messages.value", messages.value);
      sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
      if (sortedHistory.length > messages.value.length) {
        messages.value = sortedHistory;
      }else{
        logger.log("messages is longer than sortedHistory", messages.value.length, sortedHistory.length);
      }
    }
  }
}

onMounted(async () => {
  // Get current session ID
  updateCurrentSessionId();

  // Set up tab observer
  tabObserver = new MutationObserver(() => {
    updateCurrentSessionId();
  });
  
  const tabList = document.querySelector('.c-tab-list');
  if (tabList) {
    tabObserver.observe(tabList, { 
      attributes: true, 
      childList: true, 
      subtree: true 
    });
  }
  
  props.caido.storage.onChange(handleStorageChange);
  await handleStorageChange(await props.caido.storage.get());
  
  logger.log('-------------------------------ReplayShiftAgentComponent mounted');
});

onUnmounted(() => {
  if (tabObserver) {
    tabObserver.disconnect();
  }
  logger.log('ReplayShiftAgentComponent unmounted');
});

// Watch for changes in the active agent
watch(activeAgent, (newAgent, oldAgent) => {
  if (newAgent && !oldAgent) {
    logger.log('Agent activated:', newAgent.name);
  } else if (!newAgent && oldAgent) {
    logger.log('Agent deactivated');
  }
});
</script>