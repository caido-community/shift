import type { AgentSkillDefinition, SkillAttachMode, SkillScope } from "shared";
import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";

import type { SkillForm } from "../useSkills";

import { useSDK } from "@/plugins/sdk";

const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const useSkillDialog = (
  visible: Ref<boolean>,
  skillSource: MaybeRefOrGetter<AgentSkillDefinition | undefined>,
  skillContentSource: MaybeRefOrGetter<string>
) => {
  const sdk = useSDK();

  const type = ref<"static" | "dynamic">("static");
  const title = ref("");
  const content = ref("");
  const url = ref("");
  const scope = ref<SkillScope>("project");
  const description = ref("");
  const attachMode = ref<SkillAttachMode>("on-demand");
  const projectOverride = ref("");
  const originalProjectOverride = ref("");

  // Snapshot on open so the dialog keeps its content while the close animation runs.
  const openedSkill = ref<AgentSkillDefinition>();
  const isEditing = computed(() => openedSkill.value !== undefined);
  const isGlobalSkill = computed(() => openedSkill.value?.scope === "global");

  const loadProjectOverride = async (skillId: string) => {
    const result = await sdk.backend.getProjectOverride(skillId);
    const value = result.kind === "Ok" ? (result.value?.additionalContent ?? "") : "";
    projectOverride.value = value;
    originalProjectOverride.value = value;
  };

  watch(
    visible,
    (isVisible) => {
      if (!isVisible) return;

      const skill = toValue(skillSource);
      openedSkill.value = skill;
      type.value = skill?.type ?? "static";
      title.value = skill?.title ?? "";
      description.value = skill?.description ?? "";
      attachMode.value = skill?.attachMode ?? "on-demand";
      scope.value = skill?.scope ?? "project";
      content.value =
        skill === undefined
          ? ""
          : skill.type === "static"
            ? skill.content
            : toValue(skillContentSource);
      url.value = skill?.type === "dynamic" ? skill.url : "";
      projectOverride.value = "";
      originalProjectOverride.value = "";
      if (skill?.scope === "global") {
        void loadProjectOverride(skill.id);
      }
    },
    { immediate: true }
  );

  const hasUrlError = computed(() => url.value.trim() !== "" && !isValidUrl(url.value.trim()));

  const canSave = computed(() => {
    if (title.value.trim() === "") return false;
    return type.value === "static" ? content.value.trim() !== "" : isValidUrl(url.value.trim());
  });

  const buildForm = (): SkillForm | undefined => {
    if (!canSave.value) return undefined;

    const override = projectOverride.value.trim();
    return {
      type: type.value,
      title: title.value.trim(),
      content: content.value.trim(),
      url: url.value.trim(),
      scope: scope.value,
      description: description.value.trim() || undefined,
      attachMode: attachMode.value,
      projectOverride:
        isGlobalSkill.value && override !== originalProjectOverride.value.trim()
          ? override
          : undefined,
    };
  };

  return {
    type,
    title,
    content,
    url,
    scope,
    description,
    attachMode,
    projectOverride,
    isEditing,
    isGlobalSkill,
    hasUrlError,
    canSave,
    buildForm,
  };
};
