import { createApp, type App, reactive } from 'vue';
import ToolbarComponent from '../components/ReplayShiftAgent/ToolbarComponent.vue';
import ReplayShiftAgentComponent from '../components/ReplayShiftAgent/ReplayShiftAgentComponent.vue';
import type { Caido } from "@caido/sdk-frontend";
import { getPluginStorage, setPluginStorage } from "../utils/caidoUtils";

let mountedApp: App | null = null;
let mountedAgentApp: App | null = null;
let observer: MutationObserver | null = null;
let tabObserver: MutationObserver | null = null;
let currentSessionId: string | null = null;
let caidoInstance: Caido | null = null;
let storedApiEndpoint: string = '';
let agentIntegrityInterval: number | null = null;

// Create a reactive state object for the toolbar
export const toolbarState = reactive({
  sessionId: null as string | null
});

/**
 * Gets the currently selected tab's session ID
 * @returns The session ID or null if not found
 */
export function getCurrentSessionId(): string | null {
  const selectedTab = document.querySelector('.c-tab-list__tab > div[data-is-selected="true"]');
  return selectedTab ? selectedTab.getAttribute('data-session-id') : null;
}

/**
 * Checks if the current session has an associated agent and updates UI accordingly
 */
async function checkSessionAgentAssociation(): Promise<void> {
  if (!caidoInstance || !currentSessionId) return;
  
  try {
    const storage = await getPluginStorage(caidoInstance);
    const associations = storage.agentTabAssociations || {};
    const association = associations[currentSessionId];
    
    if (association) {
      // This session has an associated agent, mount the agent component
      console.log('Shift: Found agent association for session', currentSessionId);
      mountReplayShiftAgentComponent(caidoInstance, storedApiEndpoint);
      
      // Dispatch event to update toolbar UI
      window.dispatchEvent(new CustomEvent('agent-association-found'));
    } else {
      // No agent for this session, unmount any existing agent component
      console.log('Shift: No agent association for session', currentSessionId);
      unmountReplayShiftAgentComponent();
      
      // Dispatch event to update toolbar UI
      window.dispatchEvent(new CustomEvent('agent-association-not-found'));
    }
  } catch (error) {
    console.error('Shift: Error checking session agent association:', error);
  }
}

/**
 * Sets up an observer to watch for tab changes and update the session ID
 */
function setupTabObserver(): void {
  // Clean up any existing observer
  if (tabObserver) {
    tabObserver.disconnect();
  }
  
  // Initial session ID
  currentSessionId = getCurrentSessionId();
  toolbarState.sessionId = currentSessionId;
  
  // Check for agent association on initial load
  if (caidoInstance && currentSessionId) {
    checkSessionAgentAssociation();
  }
  
  // Create a new observer instance
  tabObserver = new MutationObserver((mutations) => {
    const newSessionId = getCurrentSessionId();
    
    // Only update if the session ID has changed
    if (newSessionId !== currentSessionId) {
      currentSessionId = newSessionId;
      console.log('Shift: Tab changed, new session ID:', currentSessionId);
      
      // Update the reactive state object
      toolbarState.sessionId = currentSessionId;
      
      // Check if this session has an associated agent
      if (caidoInstance) {
        checkSessionAgentAssociation();
      }
    }
  });
  
  // Start observing the document body for DOM changes related to tabs
  const tabContainer = document.querySelector('.c-tab-list');
  if (tabContainer) {
    tabObserver.observe(tabContainer, { 
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-is-selected']
    });
    console.log('Shift: Started tab observer');
  } else {
    // If tab container doesn't exist yet, observe the body for it to appear
    tabObserver.observe(document.body, { 
      childList: true,
      subtree: true
    });
    console.log('Shift: Waiting for tab container to appear');
  }
}

/**
 * Checks if the agent component is properly displayed for the current session
 * This is a sanity check to ensure the UI stays in sync with the storage state
 */
async function verifyAgentIntegrity(): Promise<void> {
  if (!caidoInstance || !currentSessionId) return;
  
  try {
    // Check if there's an agent association for this session
    const storage = await getPluginStorage(caidoInstance);
    const associations = storage.agentTabAssociations || {};
    const association = associations[currentSessionId];
    
    // Check if the agent component is visible
    const agentContainer = document.querySelector('[data-agent-container="true"] .shift-agent-card');
    
    if (association && !agentContainer && location.hash.includes('replay')) {
      // There should be an agent component, but it's not visible
      console.log('Shift: Agent integrity check failed - remounting agent component');
      mountReplayShiftAgentComponent(caidoInstance, storedApiEndpoint);
      
      // Dispatch event to update toolbar UI
      window.dispatchEvent(new CustomEvent('agent-association-found'));
    } else if (!association && agentContainer && location.hash.includes('replay')) {
      // There shouldn't be an agent component, but it is visible
      console.log('Shift: Agent integrity check failed - unmounting agent component');
      unmountReplayShiftAgentComponent();
      
      // Dispatch event to update toolbar UI
      window.dispatchEvent(new CustomEvent('agent-association-not-found'));
    }
  } catch (error) {
    console.error('Shift: Error in agent integrity check:', error);
  }
}

/**
 * Starts observing the DOM for the toolbar element and injects the Shift component
 * @param caido The Caido SDK instance
 * @param apiEndpoint The API endpoint for the Shift service
 */
export function startToolbarObserver(caido: Caido, apiEndpoint: string): void {
  // Store the caido instance and API endpoint for later use
  caidoInstance = caido;
  storedApiEndpoint = apiEndpoint;
  
  // Clean up any existing observer
  stopToolbarObserver();
  
  // Set up tab observer
  setupTabObserver();
  
  // Start periodic agent integrity check (every 2 seconds)
  agentIntegrityInterval = window.setInterval(verifyAgentIntegrity, 500);
  // Create a new observer instance
  observer = new MutationObserver((mutations) => {
    // Look for the toolbar element
    const toolbarCard = document.querySelector('.c-replay-session-toolbar__card');

    // If we found it and our component isn't already mounted
    if (toolbarCard && !document.getElementById('shift-toolbar-component')) {
      console.log('Shift: Found toolbar, injecting component');
      
      // Create a container for our component
      const container = document.createElement('div');
      container.id = 'shift-toolbar-component';
      
      // Append to the toolbar
      toolbarCard.appendChild(container);
      
      // Mount our Vue component
      mountedApp = createApp(ToolbarComponent, {
        caido,
        apiEndpoint,
        toolbarState
      });
      
      mountedApp.mount('#shift-toolbar-component');
    }
  });
  
  // Start observing the document body for DOM changes
  observer.observe(document.body, { 
    childList: true,
    subtree: true
  });
  
  console.log('Shift: Started toolbar observer');
  
  // Also check immediately in case the element already exists
  const toolbarCard = document.querySelector('.c-replay-session-toolbar__card');
  if (toolbarCard && !document.getElementById('shift-toolbar-component')) {
    const container = document.createElement('div');
    container.id = 'shift-toolbar-component';
    toolbarCard.appendChild(container);
    
    mountedApp = createApp(ToolbarComponent, {
      caido,
      apiEndpoint,
      toolbarState
    });
    
    mountedApp.mount('#shift-toolbar-component');
    console.log('Shift: Toolbar element already exists, component mounted');
  }

  // Set up event listener for agent selection
  window.addEventListener('agent-selected', ((event: Event) => {
    mountReplayShiftAgentComponent(caido, apiEndpoint);
  }) as EventListener);
  
  // Set up event listener for agent stop
  window.addEventListener('agent-stop', ((event: Event) => {
    unmountReplayShiftAgentComponent();
  }) as EventListener);
  
}

/**
 * Mounts the ReplayShiftAgentComponent when an agent is selected
 * @param caido The Caido SDK instance
 * @param apiEndpoint The API endpoint for the Shift service
 */
function mountReplayShiftAgentComponent(caido: Caido, apiEndpoint: string): void {
  // Clean up any existing agent component
  if (mountedAgentApp) {
    mountedAgentApp.unmount();
    mountedAgentApp = null;
    
    const agentContainer = document.getElementById('shift-agent-component');
    if (agentContainer) {
      agentContainer.remove();
    }
  }
  
  // Find the grid container under c-replay-session__entry
  const gridContainer = document.querySelector('.c-replay-session__entry .c-grid');
  
  if (!gridContainer) {
    console.error('Shift: Could not find grid container for agent component');
    return;
  }
  
  // Create a container for the agent component
  const container = document.createElement('div');
  container.id = 'shift-agent-component';
  container.className = 'c-grid-item';
  container.setAttribute('data-agent-container', 'true');
  
  // Modify the grid template to make space for the agent component
  // Current format is like: "grid-template-columns: 0.792985fr 5px 1.20749fr;"
  // We'll adjust it to: "grid-template-columns: 0.6fr 5px 0.6fr 5px 0.6fr;"
  const currentStyle = gridContainer.getAttribute('style') || '';
  
  if (currentStyle.includes('grid-template-columns:')) {
    const newStyle = currentStyle.replace(
      /grid-template-columns:[^;]+;/,
      'grid-template-columns: 0.6fr 5px 0.6fr 5px 0.6fr;'
    );
    gridContainer.setAttribute('style', newStyle);
  }
  
  // Add a new gutter and the agent container to the grid
  let lastGridItem = gridContainer.querySelector('.c-grid-item:last-child');
  if (!lastGridItem) {
    const lastGridGutter = gridContainer.querySelector('.c-grid-gutter:last-child');
    if (lastGridGutter) {
      lastGridGutter.remove();
    }
    lastGridItem = gridContainer.querySelector('.c-grid-item:last-child');
  }
  
  if (lastGridItem) {
    // Create new gutter
    const newGutter = document.createElement('div');
    newGutter.className = 'c-grid-gutter';
    newGutter.style.cursor = 'col-resize';
    newGutter.setAttribute('data-agent-gutter', 'true');
    
    // Append the new elements to the grid container
    gridContainer.appendChild(newGutter);
    gridContainer.appendChild(container);
    
    // Mount the agent component
    mountedAgentApp = createApp(ReplayShiftAgentComponent, {
      caido,
      apiEndpoint
    });
    
    mountedAgentApp.mount('#shift-agent-component');
    console.log('Shift: Agent component mounted in grid');
  } else {
    console.error('Shift: Could not find last grid item');
  }
}

/**
 * Unmounts the ReplayShiftAgentComponent and resets the grid layout
 */
function unmountReplayShiftAgentComponent(): void {
  // Clean up any existing agent component
  if (mountedAgentApp) {
    mountedAgentApp.unmount();
    mountedAgentApp = null;
    
    const agentContainer = document.getElementById('shift-agent-component');
    if (agentContainer) {
      agentContainer.remove();
    }
    
    // Reset the grid template columns
    const gridContainer = document.querySelector('.c-replay-session__entry .c-grid');
    if (gridContainer) {
      const currentStyle = gridContainer.getAttribute('style') || '';
      if (currentStyle.includes('grid-template-columns:')) {
        const newStyle = currentStyle.replace(
          /grid-template-columns:[^;]+;/,
          'grid-template-columns: 0.792985fr 5px 1.20749fr;'
        );
        gridContainer.setAttribute('style', newStyle);
      }
      
      // Remove the extra gutter if it exists
      const agentGutter = document.querySelector('[data-agent-gutter="true"]');
      if (agentGutter) {
        agentGutter.remove();
      }
    }
    
    console.log('Shift: Unmounted agent component');
    
    // Also remove the agent-tab association from storage
    if (caidoInstance) {
      removeAgentTabAssociation(caidoInstance);
    }
  }
}

/**
 * Removes the agent-tab association from storage
 * @param caido The Caido SDK instance
 */
async function removeAgentTabAssociation(caido: Caido): Promise<void> {
  if (!currentSessionId) return;
  
  try {
    const storage = await getPluginStorage(caido);
    const associations = storage.agentTabAssociations || {};
    
    // Remove the association
    if (associations[currentSessionId]) {
      delete associations[currentSessionId];
      
      // Update storage
      await setPluginStorage(caido, {
        agentTabAssociations: associations
      });
      
      console.log('Shift: Removed agent-tab association for session', currentSessionId);
      
      // Dispatch event to update toolbar UI
      window.dispatchEvent(new CustomEvent('agent-association-not-found'));
    }
  } catch (error) {
    console.error('Shift: Error removing agent-tab association:', error);
  }
}

/**
 * Stops the toolbar observer and cleans up the mounted component
 */
export function stopToolbarObserver(): void {
  // Disconnect the observer if it exists
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log('Shift: Stopped toolbar observer');
  }
  
  // Disconnect the tab observer if it exists
  if (tabObserver) {
    tabObserver.disconnect();
    tabObserver = null;
    console.log('Shift: Stopped tab observer');
  }
  
  // Clear the agent integrity interval
  if (agentIntegrityInterval !== null) {
    clearInterval(agentIntegrityInterval);
    agentIntegrityInterval = null;
    console.log('Shift: Stopped agent integrity check');
  }
  
  // Unmount the component if it exists
  if (mountedApp) {
    mountedApp.unmount();
    mountedApp = null;
    
    // Remove the container element
    const container = document.getElementById('shift-toolbar-component');
    if (container) {
      container.remove();
    }
    
    console.log('Shift: Unmounted toolbar component');
  }
  
  // Unmount the agent component if it exists
  if (mountedAgentApp) {
    mountedAgentApp.unmount();
    mountedAgentApp = null;
    
    // Remove the container element
    const container = document.getElementById('shift-agent-component');
    if (container) {
      container.remove();
    }
    
    // Reset the grid template columns if needed
    const gridContainer = document.querySelector('.c-replay-session__entry .c-grid');
    if (gridContainer) {
      const currentStyle = gridContainer.getAttribute('style') || '';
      if (currentStyle.includes('grid-template-columns:')) {
        const newStyle = currentStyle.replace(
          /grid-template-columns:[^;]+;/,
          'grid-template-columns: 0.792985fr 5px 1.20749fr;'
        );
        gridContainer.setAttribute('style', newStyle);
      }
      
      // Remove the extra gutter if it exists
      const agentGutter = document.querySelector('[data-agent-gutter="true"]');
      if (agentGutter) {
        agentGutter.remove();
      }
    }
    
    console.log('Shift: Unmounted agent component');
  }
  
  // Remove event listeners
  window.removeEventListener('agent-selected', (() => {
    // This is just for cleanup
  }) as EventListener);
  
  window.removeEventListener('agent-stop', (() => {
    // This is just for cleanup
  }) as EventListener);
  
  window.removeEventListener('agent-association-found', (() => {
    // This is just for cleanup
  }) as EventListener);
  
  window.removeEventListener('agent-association-not-found', (() => {
    // This is just for cleanup
  }) as EventListener);
  
  window.removeEventListener('agent-ui-check-needed', (() => {
    // This is just for cleanup
  }) as EventListener);
} 