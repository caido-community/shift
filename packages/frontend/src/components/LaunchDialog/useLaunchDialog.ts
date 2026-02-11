import { useEventListener } from "@vueuse/core";
import type { AgentSkill, Model, ResolvedCustomAgent } from "shared";
import { computed, ref, watch } from "vue";

import type { LaunchDialogResult, SelectionEntry } from "./types";

import { useSDK } from "@/plugins/sdk";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";
import { resolveModel } from "@/utils/ai";

type UseLaunchDialogOptions = {
  onConfirm: (result: LaunchDialogResult) => void;
  onCancel: () => void;
  initialSkillIds?: string[];
  initialCustomAgentId?: string;
};

export function useLaunchDialog(options: UseLaunchDialogOptions) {
  const sdk = useSDK();
  const settingsStore = useSettingsStore();
  const modelsStore = useModelsStore();
  const skillsStore = useSkillsStore();
  const customAgentsStore = useCustomAgentsStore();

  let nextEntryId = 1;
  const entries = ref<SelectionEntry[]>([{ id: 0, selection: "", comment: "" }]);
  const instructions = ref("");
  const maxIterations = ref(settingsStore.maxIterations ?? 35);
  const selectedSkillIds = ref<string[]>(options.initialSkillIds ?? []);
  const selectedCustomAgentId = ref<string | undefined>(options.initialCustomAgentId);

  const initialModel = resolveModel({
    sdk,
    savedModelKey: settingsStore.agentsModel,
    enabledModels: modelsStore.getEnabledModels({ usageType: "agent" }),
    usageType: "agent",
  });
  const selectedModel = ref<Model | undefined>(initialModel);

  const availableModels = computed(() => modelsStore.getEnabledModels({ usageType: "agent" }));
  const skillOptions = computed(() => skillsStore.skills);
  const agentOptions = computed(() => customAgentsStore.agents);

  const selectedAgent = computed((): ResolvedCustomAgent | undefined => {
    if (selectedCustomAgentId.value === undefined) return undefined;
    return customAgentsStore.getAgentById(selectedCustomAgentId.value);
  });

  const hasAgent = computed(() => selectedAgent.value !== undefined);

  const selectAgent = (agentId: string | undefined) => {
    selectedCustomAgentId.value = agentId;
  };

  watch(
    () => settingsStore.maxIterations,
    (value) => {
      if (value !== undefined && value > 0) {
        maxIterations.value = value;
      }
    }
  );

  const lastEntry = () => entries.value.at(-1) ?? undefined;

  const syncSelection = () => {
    const entry = lastEntry();
    if (entry === undefined) return;

    const selectedText = sdk.window.getActiveEditor()?.getSelectedText() ?? "";
    if (entry.selection !== selectedText) {
      entry.selection = selectedText;
    }
  };

  const addEmptyEntry = () => {
    const active = lastEntry();
    if (active !== undefined && active.selection.trim() === "" && active.comment.trim() === "") {
      syncSelection();
      return;
    }

    entries.value.push({ id: nextEntryId++, selection: "", comment: "" });
    syncSelection();
  };

  const removeEntry = (entryId: number) => {
    if (entries.value.length <= 1) {
      entries.value = [{ id: nextEntryId++, selection: "", comment: "" }];
      syncSelection();
      return;
    }

    entries.value = entries.value.filter((entry) => entry.id !== entryId);
    syncSelection();
  };

  const isSkillSelected = (id: string) => selectedSkillIds.value.includes(id);

  const toggleSkill = (id: string) => {
    if (isSkillSelected(id)) {
      selectedSkillIds.value = selectedSkillIds.value.filter((skillId) => skillId !== id);
    } else {
      selectedSkillIds.value = [...selectedSkillIds.value, id];
    }
  };

  const getSelectedSkills = (): AgentSkill[] => {
    return selectedSkillIds.value
      .map((id) => skillOptions.value.find((s) => s.id === id))
      .filter((s): s is AgentSkill => s !== undefined);
  };

  const handleConfirm = () => {
    syncSelection();

    const selections = entries.value
      .map((entry) => ({
        selection: entry.selection.trim(),
        comment: entry.comment.trim(),
      }))
      .filter((entry) => entry.selection !== "" || entry.comment !== "");

    options.onConfirm({
      customAgentId: selectedCustomAgentId.value,
      model: selectedModel.value,
      selectedSkillIds: selectedSkillIds.value,
      maxIterations: maxIterations.value,
      instructions: instructions.value.trim(),
      selections,
    });
  };

  const handleCancel = () => {
    options.onCancel();
  };

  const handleMaxIterationsInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number.parseInt(target.value, 10);
    maxIterations.value = Number.isNaN(value) ? 1 : Math.max(1, value);
  };

  const handleSelectionsKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      addEmptyEntry();
    }
  };

  useEventListener(document, "selectionchange", syncSelection);
  useEventListener(document, "mouseup", syncSelection);
  useEventListener(document, "keyup", syncSelection);

  syncSelection();

  return {
    entries,
    instructions,
    maxIterations,
    selectedModel,
    selectedSkillIds,
    selectedCustomAgentId,
    selectedAgent,
    hasAgent,
    availableModels,
    skillOptions,
    agentOptions,
    isSkillSelected,
    toggleSkill,
    selectAgent,
    getSelectedSkills,
    addEmptyEntry,
    removeEntry,
    handleConfirm,
    handleCancel,
    handleMaxIterationsInput,
    handleSelectionsKeydown,
    syncSelection,
  };
}
