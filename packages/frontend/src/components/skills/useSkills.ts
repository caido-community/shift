import type {
  AgentSkillDefinition,
  CreateDynamicSkillInput,
  CreateStaticSkillInput,
  UpdateDynamicSkillInput,
  UpdateStaticSkillInput,
} from "shared";
import { computed, ref } from "vue";

import { useSkillsStore } from "@/stores/skills";
import {
  addDynamicSkill,
  addStaticSkill,
  refreshSkills,
  removeProjectOverride,
  removeSkill,
  setProjectOverride,
  updateDynamicSkill,
  updateStaticSkill,
} from "@/stores/skills/store.effects";

export const useSkills = () => {
  const skillsStore = useSkillsStore();
  const { sdk, dispatch } = skillsStore;

  const isAddDialogVisible = ref(false);
  const isEditDialogVisible = ref(false);
  const editingSkill = ref<AgentSkillDefinition | undefined>(undefined);
  const isRefreshing = ref(false);

  const definitions = computed(() => skillsStore.definitions);
  const skills = computed(() => skillsStore.skills);
  const isLoading = computed(() => skillsStore.isLoading);

  const openAddDialog = () => {
    isAddDialogVisible.value = true;
  };

  const openEditDialog = (definition: AgentSkillDefinition) => {
    editingSkill.value = definition;
    isEditDialogVisible.value = true;
  };

  const closeEditDialog = () => {
    editingSkill.value = undefined;
    isEditDialogVisible.value = false;
  };

  const handleAddStatic = async (input: CreateStaticSkillInput) => {
    const result = await addStaticSkill(sdk, dispatch, input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    isAddDialogVisible.value = false;
  };

  const handleAddDynamic = async (input: CreateDynamicSkillInput) => {
    const result = await addDynamicSkill(sdk, dispatch, input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    isAddDialogVisible.value = false;
  };

  const handleUpdateStatic = async (id: string, input: UpdateStaticSkillInput) => {
    const result = await updateStaticSkill(sdk, dispatch, id, input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    closeEditDialog();
  };

  const handleUpdateDynamic = async (id: string, input: UpdateDynamicSkillInput) => {
    const result = await updateDynamicSkill(sdk, dispatch, id, input);
    if (result.kind === "Error") {
      sdk.window.showToast(result.error, { variant: "error" });
      return;
    }
    closeEditDialog();
  };

  const handleUpdateProjectOverride = async (skillId: string, additionalContent: string) => {
    if (additionalContent === "") {
      const result = await removeProjectOverride(sdk, dispatch, skillId);
      if (result.kind === "Error") {
        sdk.window.showToast(result.error, { variant: "error" });
      }
    } else {
      const result = await setProjectOverride(sdk, dispatch, { skillId, additionalContent });
      if (result.kind === "Error") {
        sdk.window.showToast(result.error, { variant: "error" });
      }
    }
  };

  const handleDelete = async (id: string) => {
    await removeSkill(sdk, dispatch, id);
  };

  const handleRefresh = async () => {
    isRefreshing.value = true;
    await refreshSkills(sdk, dispatch);
    isRefreshing.value = false;
  };

  const getSkillContent = (id: string): string => {
    const skill = skills.value.find((s) => s.id === id);
    return skill?.content ?? "";
  };

  return {
    definitions,
    skills,
    isLoading,
    isAddDialogVisible,
    isEditDialogVisible,
    editingSkill,
    isRefreshing,
    openAddDialog,
    openEditDialog,
    closeEditDialog,
    handleAddStatic,
    handleAddDynamic,
    handleUpdateStatic,
    handleUpdateDynamic,
    handleUpdateProjectOverride,
    handleDelete,
    handleRefresh,
    getSkillContent,
  };
};
