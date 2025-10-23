import { ref, toRefs, watch } from "vue";

import type { CustomPrompt } from "@/agents/types";
import { useSDK } from "@/plugins/sdk";
import { useConfigStore } from "@/stores/config";

export const useForm = () => {
  const sdk = useSDK();
  const configStore = useConfigStore();
  const { customPrompts } = toRefs(configStore);

  const showDialog = ref(false);
  const editingPrompt = ref<CustomPrompt | undefined>(undefined);
  const promptTitle = ref("");
  const promptContent = ref("");
  const gistUrl = ref("");
  const isGistMode = ref(false);
  const isLoadingGist = ref(false);
  const projectSpecificPrompt = ref("");
  const autoExecuteCollection = ref("");
  const promptForJitInstructions = ref(false);
  const collections = ref<Array<{ label: string; value: string }>>([]);

  const isValidGistUrl = (url: string): boolean => {
    if (url.trim() === "") return false;
    const gistRegex =
      /^https:\/\/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)(?:\/.*)?$/;
    return gistRegex.test(url.trim());
  };

  watch(gistUrl, (newUrl) => {
    if (isValidGistUrl(newUrl)) {
      handleGistUrlChange();
    }
  });

  // Watch for changes in autoExecuteCollection and disable JIT instructions when None is selected
  watch(autoExecuteCollection, (newValue, oldValue) => {
    // Only run the watcher if the value actually changed (not during initial setup)
    if (oldValue !== undefined) {
      if (!newValue || newValue === '') {
        promptForJitInstructions.value = false;
      } else {
        promptForJitInstructions.value = true;
      }
    }
  });

  const fetchCollections = async () => {
    try {
      const result = await sdk.replay.getCollections();
      
      collections.value = [
        { label: "None", value: "" },
        ...result.map((collection: any) => ({
          label: collection.name,
          value: collection.name,
        }))
      ];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `Error fetching collections: ${errorMessage}`,
        { variant: "error" }
      );
      collections.value = [{ label: "None", value: "" }];
    }
  };

  const findMatchingCollection = async (promptTitle: string): Promise<{ name: string } | null> => {
    try {
      const collections = await sdk.replay.getCollections();
      const matchingCollection = collections.find((collection: any) => collection.name === promptTitle);
      return matchingCollection ? { name: matchingCollection.name } : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sdk.window.showToast(
        `Error finding matching collection: ${errorMessage}`,
        { variant: "error" }
      );
      return null;
    }
  };

  const openEditDialog = async (prompt: CustomPrompt) => {
    if (prompt.isDefault !== undefined) return;
    
    // Fetch collections when opening the dialog
    await fetchCollections();
    
    editingPrompt.value = prompt;
    promptTitle.value = prompt.title;
    promptContent.value = prompt.content;
    gistUrl.value = prompt.gistUrl ?? "";
    isGistMode.value = prompt.gistUrl !== undefined && prompt.gistUrl !== "";
    projectSpecificPrompt.value = configStore.getProjectSpecificPrompt(prompt.id);
    
    // Set auto execute collection - check for exact title match first, then use saved value, default to None
    if (prompt.autoExecuteCollection) {
      // Use the saved value if it exists
      autoExecuteCollection.value = prompt.autoExecuteCollection;
    } else {
      // Check for exact title match
      const matchingCollection = await findMatchingCollection(prompt.title);
      if (matchingCollection) {
        autoExecuteCollection.value = matchingCollection.name;
      } else {
        // Default to None if no exact match
        autoExecuteCollection.value = "";
      }
    }
    // Set JIT instructions based on whether a collection is selected
    // If prompt has a saved value, use it; otherwise default based on collection selection
    if (prompt.promptForJitInstructions !== undefined) {
      promptForJitInstructions.value = prompt.promptForJitInstructions;
    } else {
      // Default to true if a collection is selected, false if None
      promptForJitInstructions.value = autoExecuteCollection.value !== "" && autoExecuteCollection.value !== undefined;
    }
    
    showDialog.value = true;
  };

  const resetDialog = () => {
    editingPrompt.value = undefined;
    promptTitle.value = "";
    promptContent.value = "";
    gistUrl.value = "";
    isGistMode.value = false;
    isLoadingGist.value = false;
    projectSpecificPrompt.value = "";
    autoExecuteCollection.value = "";
    promptForJitInstructions.value = false;
  };

  const closeDialog = () => {
    showDialog.value = false;
    resetDialog();
  };

  const openCreateDialog = async () => {
    // Fetch collections when opening the dialog
    await fetchCollections();
    
    // Reset all values first
    resetDialog();
    
    // Ensure checkbox is unchecked since no collection is selected by default
    promptForJitInstructions.value = false;
    
    showDialog.value = true;
  };

  const fetchGistContent = async (url: string) => {
    try {
      isLoadingGist.value = true;

      const gistId = url.match(
        /gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/,
      )?.[1];
      if (gistId === undefined) {
        throw new Error("Invalid GitHub Gist URL");
      }

      const rawUrl = `https://api.github.com/gists/${gistId}`;
      const response = await fetch(rawUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch Gist: ${response.statusText}`);
      }

      const gistData = await response.json();
      const files = Object.values(gistData.files);

      if (files.length === 0) {
        throw new Error("Gist contains no files");
      }

      const firstFile = files[0];
      const content = (firstFile as { content?: string }).content ?? "";
      const title = gistData.description;

      promptTitle.value = title;
      promptContent.value = content;
      isGistMode.value = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      sdk.window.showToast(
        `Error fetching Gist: ${errorMessage}`,
        {
          variant: "error",
        },
      );
    } finally {
      isLoadingGist.value = false;
    }
  };

  const handleGistUrlChange = async () => {
    if (gistUrl.value.trim() !== "") {
      await fetchGistContent(gistUrl.value.trim());
    } else {
      isGistMode.value = false;
      promptTitle.value = "";
      promptContent.value = "";
    }
  };

  const refreshGist = async (prompt: CustomPrompt) => {
    if (prompt.gistUrl === undefined || prompt.gistUrl === "") return;

    try {
      isLoadingGist.value = true;
      await fetchGistContent(prompt.gistUrl);

      await configStore.updateCustomPrompt({
        ...prompt,
        title: promptTitle.value,
        content: promptContent.value,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      sdk.window.showToast(
        `Error refreshing Gist: ${errorMessage}`,
        {
          variant: "error",
        },
      );
    } finally {
      isLoadingGist.value = false;
    }
  };

  const savePrompt = async () => {
    if (promptTitle.value.trim() === "" || promptContent.value.trim() === "") {
      return;
    }

    const promptData = {
      id: editingPrompt.value?.id ?? crypto.randomUUID(),
      title: promptTitle.value.trim(),
      content: promptContent.value.trim(),
      gistUrl: isGistMode.value ? gistUrl.value.trim() : undefined,
      autoExecuteCollection: autoExecuteCollection.value.trim() || undefined,
      promptForJitInstructions: promptForJitInstructions.value,
    };

    if (editingPrompt.value) {
      await configStore.updateCustomPrompt({
        ...editingPrompt.value,
        ...promptData,
      });
    } else {
      await configStore.addCustomPrompt(promptData);
    }

    // Save project-specific prompt
    if (projectSpecificPrompt.value.trim() !== "") {
      await configStore.setProjectSpecificPrompt(promptData.id, projectSpecificPrompt.value.trim());
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
    projectSpecificPrompt,
    autoExecuteCollection,
    promptForJitInstructions,
    collections,
    openEditDialog,
    openCreateDialog,
    closeDialog,
    savePrompt,
    deletePrompt,
    handleGistUrlChange,
    refreshGist,
  };
};
