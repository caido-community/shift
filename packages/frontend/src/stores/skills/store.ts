import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";

import { fetchSkills } from "./store.effects";
import { initialModel, type SkillsMessage, type SkillsModel } from "./store.model";
import { update } from "./store.update";

import { useSDK } from "@/plugins/sdk";

export const useSkillsStore = defineStore("skills", () => {
  const sdk = useSDK();
  const model = ref<SkillsModel>(initialModel);

  function dispatch(message: SkillsMessage) {
    model.value = update(model.value, message);
  }

  const definitions = computed(() => model.value.definitions);
  const skills = computed(() => model.value.skills);
  const isLoading = computed(() => model.value.isLoading);
  const error = computed(() => model.value.error);

  const getSkillById = (id: string) => skills.value.find((s) => s.id === id);

  const getDefinitionById = (id: string) => definitions.value.find((d) => d.id === id);

  async function initialize() {
    await fetchSkills(sdk, dispatch);
  }

  return {
    state: readonly(model),
    sdk,
    dispatch,
    definitions,
    skills,
    isLoading,
    error,
    getSkillById,
    getDefinitionById,
    initialize,
  };
});
