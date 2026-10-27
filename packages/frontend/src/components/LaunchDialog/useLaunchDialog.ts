import { type AgentMode, type Model, type ResolvedCustomAgent } from "shared";
import { computed, ref } from "vue";

import type { LaunchDialogProps } from "./types";

import { useSDK } from "@/plugins/sdk";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";
import { resolveModel } from "@/utils/ai";

export function useLaunchDialog(options: LaunchDialogProps) {
  const sdk = useSDK();
  const settingsStore = useSettingsStore();
  const modelsStore = useModelsStore();
  const skillsStore = useSkillsStore();
  const customAgentsStore = useCustomAgentsStore();

  const instructions = ref("");
  const mode = ref<AgentMode>("focus");
  const selectedSkillIds = ref<string[]>(options.initialSkillIds ?? []);
  const selectedCustomAgentId = ref<string | undefined>(options.initialCustomAgentId);

  const initialModel = resolveModel({
    sdk,
    savedModelKey: settingsStore.config.agentsModel,
    enabledModels: modelsStore.getEnabledModels(),
    usageType: "agent",
  });
  const selectedModel = ref<Model | undefined>(initialModel);

  const availableModels = computed(() => modelsStore.getEnabledModels());
  const skillOptions = computed(() => skillsStore.skills);
  const agentOptions = computed(() => customAgentsStore.agents);

  const selectedAgent = computed((): ResolvedCustomAgent | undefined => {
    if (selectedCustomAgentId.value === undefined) return undefined;
    return customAgentsStore.getAgentById(selectedCustomAgentId.value);
  });

  const hasAgent = computed(() => selectedAgent.value !== undefined);
  const hasAgentOptions = computed(() => agentOptions.value.length > 0);

  const selectAgent = (agentId: string | undefined) => {
    selectedCustomAgentId.value = agentId;
  };

  const openAgentsPage = () => {
    options.onCancel();
    sdk.navigation.goTo("/shift");
  };

  const isSkillSelected = (id: string) => selectedSkillIds.value.includes(id);

  const toggleSkill = (id: string) => {
    if (isSkillSelected(id)) {
      selectedSkillIds.value = selectedSkillIds.value.filter((skillId) => skillId !== id);
    } else {
      selectedSkillIds.value = [...selectedSkillIds.value, id];
    }
  };

  const handleConfirm = () => {
    options.onConfirm({
      customAgentId: selectedCustomAgentId.value,
      model: selectedModel.value,
      mode: mode.value,
      selectedSkillIds: selectedSkillIds.value,
      instructions: instructions.value.trim(),
    });
  };

  return {
    instructions,
    mode,
    selectedModel,
    selectedCustomAgentId,
    hasAgent,
    hasAgentOptions,
    availableModels,
    skillOptions,
    agentOptions,
    isSkillSelected,
    toggleSkill,
    selectAgent,
    openAgentsPage,
    handleConfirm,
  };
}
