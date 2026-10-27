import type { AgentSkillDefinition, Result, SkillAttachMode, SkillScope } from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useSkillsStore } from "@/stores/skills";

export type SkillForm = {
  type: "static" | "dynamic";
  title: string;
  content: string;
  url: string;
  scope: SkillScope;
  description: string | undefined;
  attachMode: SkillAttachMode;
  projectOverride: string | undefined;
};

export const useSkills = () => {
  const sdk = useSDK();
  const skillsStore = useSkillsStore();

  const dialog = ref<{ skill: AgentSkillDefinition | undefined }>();
  const isSaving = ref(false);
  const isRefreshing = ref(false);

  const definitions = computed(() => skillsStore.definitions);
  const isLoading = computed(() => skillsStore.isLoading);
  const hasDynamicSkills = computed(() =>
    definitions.value.some((definition) => definition.type === "dynamic")
  );

  const openAddDialog = () => {
    dialog.value = { skill: undefined };
  };

  const openEditDialog = (skill: AgentSkillDefinition) => {
    dialog.value = { skill };
  };

  const closeDialog = () => {
    dialog.value = undefined;
  };

  const notifyFailure = (result: Result<void>) => {
    if (result.kind === "Error") sdk.window.showToast(result.error, { variant: "error" });
    return result.kind === "Ok";
  };

  const saveSkill = (form: SkillForm, skill: AgentSkillDefinition | undefined) => {
    const base = { title: form.title, description: form.description, attachMode: form.attachMode };
    if (skill === undefined) {
      return form.type === "static"
        ? skillsStore.addStatic({ ...base, content: form.content, scope: form.scope })
        : skillsStore.addDynamic({ ...base, url: form.url, scope: form.scope });
    }
    return skill.type === "static"
      ? skillsStore.updateStatic(skill.id, { ...base, content: form.content })
      : skillsStore.updateDynamic(skill.id, { ...base, url: form.url });
  };

  const saveProjectOverride = (skillId: string, additionalContent: string) =>
    additionalContent === ""
      ? skillsStore.removeProjectOverride(skillId)
      : skillsStore.setProjectOverride({ skillId, additionalContent });

  const handleSave = async (form: SkillForm) => {
    const skill = dialog.value?.skill;
    isSaving.value = true;
    try {
      if (!notifyFailure(await saveSkill(form, skill))) return;
      if (
        skill !== undefined &&
        form.projectOverride !== undefined &&
        !notifyFailure(await saveProjectOverride(skill.id, form.projectOverride))
      ) {
        return;
      }
      closeDialog();
    } finally {
      isSaving.value = false;
    }
  };

  const handleDelete = async (id: string) => {
    notifyFailure(await skillsStore.remove(id));
  };

  const handleRefresh = async () => {
    isRefreshing.value = true;
    notifyFailure(await skillsStore.refresh());
    isRefreshing.value = false;
  };

  const getSkillContent = (id: string): string =>
    skillsStore.skills.find((s) => s.id === id)?.content ?? "";

  return {
    definitions,
    isLoading,
    hasDynamicSkills,
    dialog,
    isSaving,
    isRefreshing,
    openAddDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    handleDelete,
    handleRefresh,
    getSkillContent,
  };
};
