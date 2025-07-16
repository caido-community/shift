import { createApp, ref } from 'vue';
import PrimeVue from 'primevue/config';
import { Classic } from '@caido/primevue';
//import ShiftUI from './components/ShiftUI.vue';
import ShiftPage from './components/ShiftPage/App.vue';
import ShiftFloat from './components/ShiftFloat.vue';
import type { Caido } from "@caido/sdk-frontend";
import { ActiveEntity, API_ENDPOINT, PAGE, CURRENT_VERSION, isDev} from "./constants";
import { tests } from "./testSuite";
import { handleServerResponse, fetchShiftResponse, checkAndRenameReplayTabs } from "./utils/shiftUtils";
import { getCurrentProjectName, getPluginStorage, setPluginStorage } from "./utils/caidoUtils";
// import "./styles/globalStyles.css";
import "./styles/ToolbarComponentGlobal.css";
import "./styles/ReplayShiftAgentGlobal.css";
import "./styles/AgentLaunchModalGlobal.css";
//import { applyAutocomplete } from "./autoComplete";
import CustomToast from './components/CustomToast.vue'
import logger from './utils/logger';
import { initAgentMonitoring } from "./agent";

const isShiftOpen = ref(false);
const updateMemory = ref(false);
let renameInterval: number | null = null;

// --------------------- RENAME ---------------------
const startRenameInterval = async (caido: Caido) => {
  // Clear any existing interval
  if (renameInterval) {
    logger.log("Clearing rename interval", renameInterval);
    clearInterval(renameInterval);
    renameInterval = null;
  }

  // Get settings from storage
  const storage = await getPluginStorage(caido);
  if (storage.settings?.aiRenameReplayTabs) {
      logger.log("Starting rename interval", storage.settings.renameDelay*1000);
    renameInterval = window.setInterval(async () => {
      try {
        logger.log("rename interval tick")
        const currentStorage = await getPluginStorage(caido);
        const currentSettings = currentStorage?.settings;
        
        // If settings were updated, use the new values
        if (currentSettings?.aiRenameReplayTabs && !window.renameLock) {
          window.renameLock=true;
          await checkAndRenameReplayTabs(
            caido,
            currentStorage.apiKey,
            getCurrentProjectName(),
            currentSettings.renameDelay,
            currentSettings.renameInstructions
          );
          window.renameLock=false;
        }
      } catch (error) {
        window.renameLock = false;
        logger.error('Error in rename interval:', error);
      }
    }, storage.settings.renameDelay * 1000);
  }
};


// --------------------- MEMORY ---------------------
const addToMemory = async (caido: Caido) => {
  logger.log("Adding to memory");
  const text = caido.window.getActiveEditor()?.getSelectedText();
  logger.log("storage",await getPluginStorage(caido));
  const storage = await getPluginStorage(caido);
  const projectName = getCurrentProjectName() || 'default';
  
  // Ensure memory is an object
  if (typeof storage.settings.memory === 'string') {
    storage.settings.memory = {
      [projectName]: storage.settings.memory
    };
  }
  
  // Ensure the project exists in memory
  if (!storage.settings.memory[projectName as keyof typeof storage.settings.memory]) {
    (storage.settings.memory as Record<string, string>)[projectName] = '';
  }
  
  // Add text to memory
  if ((storage.settings.memory as Record<string, string>)[projectName] !== '') {
    (storage.settings.memory as Record<string, string>)[projectName] = (storage.settings.memory as Record<string, string>)[projectName] + "\n" + text;
  } else {
    (storage.settings.memory as Record<string, string>)[projectName] = text || '';
  }
  
  await setPluginStorage(caido, storage);
  updateMemory.value = !updateMemory.value;
  logger.log(storage);
  await caido.window.showToast("Updated memory", {variant: "success", duration: 2000});
}


// --------------------- AUTOCOMPLETE ---------------------
const initAutoComplete = (caido: Caido) => {
  logger.log("Initializing auto complete");
  var interval = setInterval(()=>{
    const editor = caido.window.getActiveEditor()?.getEditorView();
    logger.log("editor", editor?.state.doc.toString());
    if (editor) {

      applyAutocomplete(editor);
      clearInterval(interval);
    }
  }, 1000)
}


// --------------------- UI ---------------------

const addPage = async (caido: Caido) => {
  const app = createApp(ShiftPage, { 
    caido: caido, 
    apiEndpoint: API_ENDPOINT, 
    startRenameInterval: startRenameInterval, 
    updateMemory: updateMemory
  });

  const container = document.createElement('div');
  container.style.height = '100%';
  container.style.width = '100%';
  app.use(PrimeVue, { unstyled: true, pt:Classic});
  const card = caido.ui.card({
    body: container,
  });
  app.mount(container);

  // Create plugin page in left tab menu.
  caido.navigation.addPage(PAGE, {
    body: card,
  });
  caido.sidebar.registerItem("Shift", PAGE, {
    icon: "far fa-arrow-alt-circle-up",
  });
  logger.log("Mounted app add page");
};

const spawnCommandInterfaceUI = async (caido: Caido) => {
  logger.log("spawnCommandInterfaceUI started");
  
  // If the interface is already open, toggle its visibility
  const existingInterface = document.querySelector('.shift-floating-interface');
  if (existingInterface) {
    logger.log("existingInterface", existingInterface);
    if (existingInterface.classList.contains('hidden')) {
      existingInterface.classList.remove('hidden');
      document.querySelector('.shift-textarea')?.focus();
    } else {
      existingInterface.classList.add('hidden');
      caido.window.getActiveEditor()?.focus();
    }
    return; // Exit the function early as we've toggled visibility
  }
  isShiftOpen.value = true;

  logger.log("Creating new interface");
  const container = document.createElement('div');
  container.id = "plugin--shift"; // Temporary fix for the plugin page not being found
  container.classList.add('shift-floating-interface');
  document.body.appendChild(container);
  logger.log("Container added to body");

  // Retrieve saved position from storage
  const storage = await getPluginStorage(caido);
  const savedPosition = storage.shiftFloatingPosition;
  logger.log("Saved position:", savedPosition);
  if (savedPosition) {
    const { x, y } = savedPosition;
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
  }

  const handleSubmit = async (text: string, activeEntity: ActiveEntity, context: any): Promise<string> => {
    logger.log("Submitted text:", text);
    const storage = await getPluginStorage(caido);
    const apiKey = storage.apiKey;
    const projectName = getCurrentProjectName() || 'default';
    
    // Get memory for current project
    let memory = "";
    if (typeof storage?.settings?.memory === 'string') {
      memory = storage.settings.memory;
    } else if (storage?.settings?.memory) {
      memory = storage.settings.memory[projectName] || "";
    }
    
    // Get aiInstructions for current project
    let aiInstructions = "";
    if (typeof storage?.settings?.aiInstructions === 'string') {
      aiInstructions = storage.settings.aiInstructions;
    } else if (storage?.settings?.aiInstructions) {
      aiInstructions = storage.settings.aiInstructions[projectName] || "";
    }
    
    try {
      let response;
      if (isDev && window.name.indexOf("localapi") != -1 && Object.keys(tests).includes(text)) {
        logger.log("Running test", text);
        logger.log("tests", tests);
        response = tests[text as keyof typeof tests];
      }else{
        response = await fetchShiftResponse(apiKey, text, activeEntity, context, memory, aiInstructions);
      }
        logger.log("Shift response:", response);
        
      // Create container for toast
      const toastContainer = document.createElement('div');
      toastContainer.id = "plugin--shift";
      document.body.appendChild(toastContainer);
      
      // Create toast instance with message in props
      if (response.actions.length > 0) {
        logger.log("response.actions", response.actions);
        const toastApp = createApp(CustomToast, {
          variant: 'success',
          duration: 20000,
          responseId: response.id,
          apiKey: apiKey,
          message: "Taking following actions: " + response.actions.map((action: any) => action.name).join(", "),
          userInput: text,
          activeEntity: activeEntity,
          context: context,
          serverResponse: response,
          onClose: () => {
            toastApp.unmount();
            document.body.removeChild(toastContainer);
          }
        });
        // Mount toast
        toastApp.mount(toastContainer);
      }else{
        const toastApp = createApp(CustomToast, {
          variant: 'info',
          duration: 20000,
          responseId: response.id,
          apiKey: apiKey,
          message: "No actions taken.",
          userInput: text,
          activeEntity: activeEntity,
          context: context,
          serverResponse: response,
          onClose: () => {
            toastApp.unmount();
            document.body.removeChild(toastContainer);
          }
        });
        toastApp.mount(toastContainer);
      }
      

      handleServerResponse(caido, response.actions);
      return ""; // Success case
    } catch (error) {
      // Create error toast
      const toastContainer = document.createElement('div');
      toastContainer.id = "plugin--shift";
      document.body.appendChild(toastContainer);
      
      const toastApp = createApp(CustomToast, {
        variant: 'error',
        duration: 20000,
        responseId: '',
        apiKey: apiKey,
        message: `${error}`,
        userInput: text,
        activeEntity: activeEntity,
        context: context,
        onClose: () => {
          toastApp.unmount();
          document.body.removeChild(toastContainer);
        }
      });
      
      toastApp.mount(toastContainer);
      return `Error: ${error}`; // Error case
    } finally {
      closeInterface();
    }
  };

  const closeInterface = async () => {
    logger.log("Closing command interface");
    isShiftOpen.value = false;
    
    // Save the current position before unmounting
    const storage = await getPluginStorage(caido);
    logger.log(storage.shiftFloatingPosition);
    
    app.unmount();
    document.body.removeChild(container);
  };

  logger.log("instantiating app");
  const app = createApp(ShiftFloat, {
    onSubmit: handleSubmit,
    onClose: closeInterface,
    caido: caido,
    onPositionChange: async (x: number, y: number) => {
      logger.log("Position changed to:", x, y);
      const storage = await getPluginStorage(caido);
      storage.shiftFloatingPosition = { x, y };
      await setPluginStorage(caido, storage);
    },
  });
  logger.log("instantiating app2");
  app.mount(container);
  logger.log("Mounted app spawnCommandInterfaceUI");
};


// --------------------- UPDATE CHECK ---------------------
const checkForUpdates = (caido: Caido) => {
  logger.log("Checking for updates");
  fetch(`${API_ENDPOINT}/version`).then(async (response) => {
    const data = await response.json();
    if (data.version !== CURRENT_VERSION) {
      if (data.message && data.duration) {
        caido.window.showToast(data.message, {variant: "info", duration: data.duration});
      } else {
        caido.window.showToast(`Shift is at version ${data.version}. You are on ${CURRENT_VERSION}. Update via Plugins -> Store.`, {variant: "info", duration: 3000});
      }
    }
  }).catch((error) => {
    logger.error("Error checking for updates:", error);
  });
}

export const init = async (caido: Caido) => {
  caido.commands.register("shift.floating", {
    name: "Shift Floating Command",
    run: () => spawnCommandInterfaceUI(caido),
    group: "Shift",
  });
  caido.commands.register("shift.addToMemory", {
    name: "Add to Memory",
    run: () => addToMemory(caido),
    group: "Shift",
  });
  window.caido = caido;
  caido.commandPalette.register("shift.floating", "Shift Floating Command");
  caido.shortcuts.register("shift.floating", ["shift", "space"]);
  caido.menu.registerItem({type:"Request", commandId: "shift.addToMemory", label: "Add to Memory"});
  caido.menu.registerItem({type:"Response", commandId: "shift.addToMemory", label: "Add to Memory"});
  caido.shortcuts.register("shift.addToMemory", ["control", "shift", "M"]);
  addPage(caido);
  startRenameInterval(caido);
  setTimeout(()=>{
    checkForUpdates(caido);
  }, 7000);
  // initAutoComplete(caido);
  
  // Initialize agent monitoring
  //initAgentMonitoring(caido);
}
