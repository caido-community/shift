import { defineStore } from "pinia";
import {
  type CreateDynamicSkillInput,
  type CreateStaticSkillInput,
  Result,
  type SetProjectOverrideInput,
  type SkillsState,
  type UpdateDynamicSkillInput,
  type UpdateStaticSkillInput,
} from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";

export const useSkillsStore = defineStore("skills", () => {
  const sdk = useSDK();
  const state = ref<SkillsState>({ definitions: [], skills: [] });
  const isLoading = ref(false);

  async function initialize() {
    isLoading.value = true;
    const [definitions, skills] = await Promise.all([
      sdk.backend.getSkillDefinitions(),
      sdk.backend.getSkills(),
    ]);
    if (definitions.kind === "Ok" && skills.kind === "Ok") {
      state.value = { definitions: definitions.value, skills: skills.value };
    }
    isLoading.value = false;
  }

  async function setState(result: Result<SkillsState>): Promise<Result<void>> {
    if (result.kind === "Error") return result;
    state.value = result.value;
    await useCustomAgentsStore().initialize();
    return Result.ok(undefined);
  }

  async function addStatic(input: CreateStaticSkillInput) {
    return setState(await sdk.backend.addStaticSkill(input));
  }

  async function addDynamic(input: CreateDynamicSkillInput) {
    return setState(await sdk.backend.addDynamicSkill(input));
  }

  async function updateStatic(id: string, input: UpdateStaticSkillInput) {
    return setState(await sdk.backend.updateStaticSkill(id, input));
  }

  async function updateDynamic(id: string, input: UpdateDynamicSkillInput) {
    return setState(await sdk.backend.updateDynamicSkill(id, input));
  }

  async function remove(id: string) {
    return setState(await sdk.backend.removeSkill(id));
  }

  async function refresh() {
    return setState(await sdk.backend.refreshSkills());
  }

  async function setProjectOverride(input: SetProjectOverrideInput) {
    return setState(await sdk.backend.setProjectOverride(input));
  }

  async function removeProjectOverride(skillId: string) {
    return setState(await sdk.backend.removeProjectOverride(skillId));
  }

  return {
    definitions: computed(() => state.value.definitions),
    skills: computed(() => state.value.skills),
    isLoading: computed(() => isLoading.value),
    initialize,
    addStatic,
    addDynamic,
    updateStatic,
    updateDynamic,
    remove,
    refresh,
    setProjectOverride,
    removeProjectOverride,
  };
});
