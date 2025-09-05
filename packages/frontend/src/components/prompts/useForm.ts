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
  const gistUrl = ref("");
  const isGistMode = ref(false);
  const isLoadingGist = ref(false);

  const openEditDialog = (prompt: CustomPrompt) => {
    if (prompt.isDefault !== undefined) return;
    editingPrompt.value = prompt;
    promptTitle.value = prompt.title;
    promptContent.value = prompt.content;
    gistUrl.value = prompt.gistUrl || "";
    isGistMode.value = !!prompt.gistUrl;
    showDialog.value = true;
  };

  const resetDialog = () => {
    editingPrompt.value = undefined;
    promptTitle.value = "";
    promptContent.value = "";
    gistUrl.value = "";
    isGistMode.value = false;
    isLoadingGist.value = false;
  };

  const closeDialog = () => {
    showDialog.value = false;
    resetDialog();
  };

  const openCreateDialog = () => {
    showDialog.value = true;
    resetDialog();
  };

  const fetchGistContent = async (url: string) => {
    try {
      isLoadingGist.value = true;
      
      // Convert gist URL to raw content URL
      const gistId = url.match(/gist\.github\.com\/(?:[^\/]+\/)?([a-f0-9]+)/)?.[1];
      if (!gistId) {
        throw new Error("Invalid GitHub Gist URL");
      }
      
      const rawUrl = `https://api.github.com/gists/${gistId}`;
      const response = await fetch(rawUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Gist: ${response.statusText}`);
      }
      
      const gistData = await response.json();
      const files = Object.values(gistData.files) as any[];
      
      if (files.length === 0) {
        throw new Error("Gist contains no files");
      }
      
      // Use the first file's content
      const firstFile = files[0];
      const content = firstFile.content || "";
      
      // Extract title from filename (remove extension)
      const title = gistData.description;
      
      promptTitle.value = title;
      promptContent.value = content;
      isGistMode.value = true;
      
    } catch (error) {
      console.error("Error fetching Gist:", error);
      alert(`Error fetching Gist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      isLoadingGist.value = false;
    }
  };

  const handleGistUrlChange = async () => {
    if (gistUrl.value.trim()) {
      await fetchGistContent(gistUrl.value.trim());
    } else {
      isGistMode.value = false;
      promptTitle.value = "";
      promptContent.value = "";
    }
  };

  const refreshGist = async (prompt: CustomPrompt) => {
    if (!prompt.gistUrl) return;
    
    try {
      isLoadingGist.value = true;
      await fetchGistContent(prompt.gistUrl);
      
      // Update the existing prompt with refreshed content
      await configStore.updateCustomPrompt({
        ...prompt,
        title: promptTitle.value,
        content: promptContent.value,
      });
    } catch (error) {
      console.error("Error refreshing Gist:", error);
      alert(`Error refreshing Gist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      isLoadingGist.value = false;
    }
  };

  const savePrompt = async () => {
    if (promptTitle.value.trim() === "" || promptContent.value.trim() === "") {
      return;
    }

    const promptData = {
      id: editingPrompt.value?.id || crypto.randomUUID(),
      title: promptTitle.value.trim(),
      content: promptContent.value.trim(),
      gistUrl: isGistMode.value ? gistUrl.value.trim() : undefined,
    };

    if (editingPrompt.value) {
      await configStore.updateCustomPrompt({
        ...editingPrompt.value,
        ...promptData,
      });
    } else {
      await configStore.addCustomPrompt(promptData);
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
    gistUrl,
    isGistMode,
    isLoadingGist,
    openEditDialog,
    openCreateDialog,
    closeDialog,
    savePrompt,
    deletePrompt,
    handleGistUrlChange,
    refreshGist,
  };
};
