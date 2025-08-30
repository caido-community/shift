import { ref, toRefs } from "vue";

import type { CustomPrompt } from "@/agents/types";
import { useConfigStore } from "@/stores/config";

export const useForm = () => {
  const configStore = useConfigStore();
  const { customPrompts } = toRefs(configStore);

  const showDialog = ref(false);
  const editingPrompt = ref<CustomPrompt | undefined>(undefined);
  const promptTitle = ref("");
  const promptContent = ref("");

  const openEditDialog = (prompt: CustomPrompt) => {
    if (prompt.isDefault !== undefined) return;
    editingPrompt.value = prompt;
    promptTitle.value = prompt.title;
    promptContent.value = prompt.content;
    showDialog.value = true;
  };

  const resetDialog = () => {
    editingPrompt.value = undefined;
    promptTitle.value = "";
    promptContent.value = "";
  };

  const closeDialog = () => {
    showDialog.value = false;
    resetDialog();
  };

  const openCreateDialog = () => {
    showDialog.value = true;
    resetDialog();
  };

  const savePrompt = async () => {
    if (promptTitle.value.trim() === "" || promptContent.value.trim() === "") {
      return;
    }

    if (editingPrompt.value) {
      await configStore.updateCustomPrompt({
        ...editingPrompt.value,
        title: promptTitle.value.trim(),
        content: promptContent.value.trim(),
      });
    } else {
      await configStore.addCustomPrompt({
        id: crypto.randomUUID(),
        title: promptTitle.value.trim(),
        content: promptContent.value.trim(),
      });
    }

    closeDialog();
  };

  const deletePrompt = async (id: string, isDefault?: boolean) => {
    if (isDefault !== undefined) return;
    await configStore.deleteCustomPrompt(id);
  };

  return {
    customPrompts,
    showDialog,
    editingPrompt,
    promptTitle,
    promptContent,
    openEditDialog,
    openCreateDialog,
    closeDialog,
    savePrompt,
    deletePrompt,
  };
};
