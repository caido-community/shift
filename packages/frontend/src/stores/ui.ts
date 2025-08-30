import { defineStore } from "pinia";
import { ref } from "vue";

type UIState = {
  input: string;
  selectedPrompts: string[];
};

export const useUIStore = defineStore("stores.ui", () => {
  const drawerVisible = ref(false);
  const agentsUI = ref<Record<string, UIState>>({});

  const toggleDrawer = () => {
    drawerVisible.value = !drawerVisible.value;
  };

  function getUIState(agentId: string): UIState {
    if (!agentsUI.value[agentId]) {
      agentsUI.value[agentId] = {
        input: "",
        selectedPrompts: [],
      };
    }

    return agentsUI.value[agentId];
  }

  function setInput(agentId: string, value: string) {
    getUIState(agentId).input = value;
  }

  function getInput(agentId: string) {
    return getUIState(agentId).input;
  }

  function selectPrompt(agentId: string, promptId: string) {
    getUIState(agentId).selectedPrompts.push(promptId);
  }

  function unselectPrompt(agentId: string, promptId: string) {
    getUIState(agentId).selectedPrompts = getUIState(
      agentId,
    ).selectedPrompts.filter((id) => id !== promptId);
  }

  function setSelectedPrompts(agentId: string, promptIds: string[]) {
    getUIState(agentId).selectedPrompts = [...promptIds];
  }

  function getSelectedPrompts(agentId: string) {
    return getUIState(agentId).selectedPrompts;
  }

  return {
    drawerVisible,
    toggleDrawer,
    agentsUI,
    setInput,
    getInput,
    selectPrompt,
    unselectPrompt,
    setSelectedPrompts,
    getSelectedPrompts,
  };
});
