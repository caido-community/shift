import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { models } from "./models";
import { defaultCustomPrompts } from "./prompts";

import type {
  AISessionRenamingConfig,
  CustomPrompt,
  ReasoningConfig,
} from "@/agents/types";
import { useSDK } from "@/plugins/sdk";
import { type PluginStorage } from "@/types";

const DEFAULT_AGENTS_MODEL = "anthropic/claude-sonnet-4.5";
const DEFAULT_FLOAT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_RENAMING_MODEL = "google/gemini-2.5-flash-lite";

// TODO: cleanup the store, maybe split it up a bit
export const useConfigStore = defineStore("stores.config", () => {
  const sdk = useSDK();

  const customPrompts = ref<CustomPrompt[]>(defaultCustomPrompts);
  const _openRouterApiKey = ref<string>("");
  const _agentsModel = ref<string>(DEFAULT_AGENTS_MODEL);
  const _floatModel = ref<string>(DEFAULT_FLOAT_MODEL);
  const _renamingModel = ref<string>(DEFAULT_RENAMING_MODEL);
  const _maxIterations = ref<number>(35);
  const projectLearningsById = ref<Record<string, string[]>>({});
  const projectHistoryById = ref<Record<string, string[]>>({});
  const projectSpecificPromptsById = ref<
    Record<string, Record<string, string>>
  >({});
  const projectAutoExecuteCollectionsById = ref<
    Record<string, Record<string, string>>
  >({});
  const projectJitInstructionsById = ref<
    Record<string, Record<string, boolean>>
  >({});
  const projectShiftCollectionAutoCreateById = ref<Record<string, boolean>>({});
  const reasoningConfig = ref<ReasoningConfig>({
    enabled: true,
    max_tokens: 1500,
  });
  const _aiSessionRenaming = ref<AISessionRenamingConfig>({
    enabled: false,
    renameAfterSend: false,
    instructions:
      "Include the HTTP Verb, and a concise version of the path in the tab name. Focus on the end of the path. Include only the first 4 characters of IDs.\nExample: GET /api/v1/users/{id}/profile\nUNLESS, the current request is a graphql request, then use the operationName if present.",
  });

  const isValidModel = (
    modelId: string,
    context: "agents" | "float" | "renaming",
  ): boolean => {
    const allModels = models.flatMap((group) => group.items);
    const model = allModels.find((item) => item.id === modelId);

    if (!model) {
      return false;
    }

    if (model.onlyFor && model.onlyFor !== context) {
      return false;
    }

    return true;
  };

  const _projectId = ref<string>("");

  // Initialize project ID asynchronously
  sdk.graphql.currentProject().then((project) => {
    _projectId.value = project?.currentProject?.project?.id ?? "";
  });

  sdk.projects.onCurrentProjectChange((event) => {
    if (event.projectId !== undefined) {
      _projectId.value = event.projectId;
    }
  });


  const openRouterApiKey = computed({
    get() {
      return _openRouterApiKey.value;
    },
    set(value: string) {
      _openRouterApiKey.value = value;
      saveSettings();
    },
  });

  const agentsModel = computed({
    get() {
      return _agentsModel.value;
    },
    set(value: string) {
      _agentsModel.value = value;
      saveSettings();
    },
  });

  const floatModel = computed({
    get() {
      return _floatModel.value;
    },
    set(value: string) {
      _floatModel.value = value;
      saveSettings();
    },
  });
  const renamingModel = computed({
    get() {
      return _renamingModel.value;
    },
    set(value: string) {
      _renamingModel.value = value;
      saveSettings();
    },
  });
  const getProjectLearnings = (projectId: string): string[] => {
    const learnings = projectLearningsById.value[projectId];
    return Array.isArray(learnings) ? [...learnings] : [];
  };

  const setProjectLearnings = (projectId: string, learnings: string[]) => {
    projectLearningsById.value = {
      ...projectLearningsById.value,
      [projectId]: [...learnings],
    };
  };

  const updateLearningsForProject = async (
    projectId: string,
    updater: (current: string[]) => string[],
  ) => {
    const next = updater(getProjectLearnings(projectId));
    setProjectLearnings(projectId, next);
    await saveSettings();
  };

  const learnings = computed(() => {
    return getProjectLearnings(_projectId.value);
  });

  const setLearnings = async (entries: string[]) => {
    await updateLearningsForProject(_projectId.value, () => entries);
  };

  const removeLearnings = async (indexes: number[]) => {
    if (indexes.length === 0) {
      return;
    }
    const targets = new Set(indexes);
    await updateLearningsForProject(_projectId.value, (current) =>
      current.filter((_, idx) => !targets.has(idx)),
    );
  };

  const addLearning = async (entry: string) => {
    if (entry.trim().length === 0) {
      return;
    }
    await updateLearningsForProject(_projectId.value, (current) => [
      ...current,
      entry,
    ]);
  };

  const updateLearning = async (index: number, entry: string) => {
    if (index < 0) {
      return;
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      await removeLearnings([index]);
      return;
    }
    await updateLearningsForProject(_projectId.value, (current) => {
      if (index >= current.length) {
        return current;
      }
      const next = [...current];
      next[index] = entry;
      return next;
    });
  };

  const clearLearnings = async () => {
    await updateLearningsForProject(_projectId.value, () => []);
  };
  const maxIterations = computed({
    get() {
      return _maxIterations.value;
    },
    set(value: number) {
      _maxIterations.value = value;
      saveSettings();
    },
  });

  const autoCreateShiftCollection = computed({
    get() {
      const projectId = _projectId.value;
      const value = projectShiftCollectionAutoCreateById.value[projectId];
      return value ?? true;
    },
    set(enabled: boolean) {
      const projectId = _projectId.value;
      projectShiftCollectionAutoCreateById.value = {
        ...projectShiftCollectionAutoCreateById.value,
        [projectId]: enabled,
      };
      saveSettings();
    },
  });

  const aiSessionRenaming = computed({
    get() {
      return _aiSessionRenaming.value;
    },
    set(value: AISessionRenamingConfig) {
      _aiSessionRenaming.value = value;
      saveSettings();
    },
  });

  const normalizeLearningsRecord = (
    record: Record<string, unknown> | undefined,
  ): Record<string, string[]> => {
    if (!record) {
      return {};
    }

    const normalized: Record<string, string[]> = {};
    for (const [projectId, value] of Object.entries(record)) {
      if (Array.isArray(value)) {
        const entries = value.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        );
        if (entries.length > 0) {
          normalized[projectId] = [...entries];
        }
        continue;
      }

      if (typeof value === "string") {
        if (value.trim().length > 0) {
          normalized[projectId] = [value];
        }
        continue;
      }
    }

    return normalized;
  };

  const convertLegacyMemoryRecord = (
    record: Record<string, string>,
  ): Record<string, string[]> => {
    const normalized: Record<string, string[]> = {};
    for (const [projectId, value] of Object.entries(record)) {
      if (typeof value === "string" && value.trim().length > 0) {
        normalized[projectId] = [value];
      }
    }
    return normalized;
  };

  const saveSettings = async () => {
    const normalizedLearnings = normalizeLearningsRecord(
      projectLearningsById.value,
    );
    projectLearningsById.value = normalizedLearnings;

    const settings: PluginStorage = {
      openRouterApiKey: _openRouterApiKey.value,
      agentsModel: _agentsModel.value,
      floatModel: _floatModel.value,
      renamingModel: _renamingModel.value,
      reasoningConfig: reasoningConfig.value,
      customPrompts: customPrompts.value,
      maxIterations: _maxIterations.value,
      aiSessionRenaming: _aiSessionRenaming.value,
      projectLearningsById: normalizedLearnings,
      projectHistoryById: projectHistoryById.value,
      projectSpecificPromptsById: projectSpecificPromptsById.value,
      projectAutoExecuteCollectionsById:
        projectAutoExecuteCollectionsById.value,
      projectJitInstructionsById: projectJitInstructionsById.value,
      projectShiftCollectionAutoCreateById:
        projectShiftCollectionAutoCreateById.value,
    };
    await sdk.storage.set(settings);
  };

  const loadSettings = () => {
    const settings = sdk.storage.get() as PluginStorage | undefined;
    if (settings) {
      if (settings.openRouterApiKey !== undefined) {
        _openRouterApiKey.value = settings.openRouterApiKey;
      }
      if (settings.agentsModel !== undefined) {
        _agentsModel.value = isValidModel(settings.agentsModel, "agents")
          ? settings.agentsModel
          : DEFAULT_AGENTS_MODEL;
      }
      if (settings.floatModel !== undefined) {
        _floatModel.value = isValidModel(settings.floatModel, "float")
          ? settings.floatModel
          : DEFAULT_FLOAT_MODEL;
      }
      if (settings.renamingModel !== undefined) {
        _renamingModel.value = isValidModel(settings.renamingModel, "renaming")
          ? settings.renamingModel
          : DEFAULT_RENAMING_MODEL;
      }
      if (settings.reasoningConfig !== undefined) {
        reasoningConfig.value = settings.reasoningConfig;
      }
      if (settings.customPrompts !== undefined) {
        customPrompts.value = settings.customPrompts;
      }
      if (settings.maxIterations !== undefined) {
        _maxIterations.value = settings.maxIterations;
      }
      if (settings.aiSessionRenaming !== undefined) {
        _aiSessionRenaming.value = settings.aiSessionRenaming;
      }
      if (settings.projectLearningsById !== undefined) {
        projectLearningsById.value = normalizeLearningsRecord(
          settings.projectLearningsById,
        );
      } else if (settings.projectMemoryById !== undefined) {
        projectLearningsById.value = convertLegacyMemoryRecord(
          settings.projectMemoryById,
        );
      }
      if (settings.projectHistoryById !== undefined) {
        projectHistoryById.value = settings.projectHistoryById;
      }
      if (settings.projectSpecificPromptsById !== undefined) {
        projectSpecificPromptsById.value = settings.projectSpecificPromptsById;
      }
      if (settings.projectAutoExecuteCollectionsById !== undefined) {
        projectAutoExecuteCollectionsById.value =
          settings.projectAutoExecuteCollectionsById;
      }
      if (settings.projectJitInstructionsById !== undefined) {
        projectJitInstructionsById.value = settings.projectJitInstructionsById;
      }
      if (settings.projectShiftCollectionAutoCreateById !== undefined) {
        projectShiftCollectionAutoCreateById.value =
          settings.projectShiftCollectionAutoCreateById;
      }
    }
  };

  const setReasoningConfig = async (config: ReasoningConfig) => {
    reasoningConfig.value = config;
    await saveSettings();
  };

  const updateReasoningConfig = async (updates: Partial<ReasoningConfig>) => {
    reasoningConfig.value = { ...reasoningConfig.value, ...updates };
    await saveSettings();
  };

  const addCustomPrompt = async (prompt: CustomPrompt) => {
    customPrompts.value.push(prompt);
    await saveSettings();
  };

  const updateCustomPrompt = async (prompt: CustomPrompt) => {
    const index = customPrompts.value.findIndex((p) => p.id === prompt.id);
    if (index !== -1) {
      customPrompts.value[index] = prompt;
      await saveSettings();
    }
  };

  const deleteCustomPrompt = async (id: string) => {
    customPrompts.value = customPrompts.value.filter((p) => p.id !== id);
    await saveSettings();
  };

  loadSettings();

  sdk.storage.onChange((newSettings) => {
    const settings = newSettings as PluginStorage | undefined;
    if (settings) {
      if (settings.openRouterApiKey !== undefined) {
        _openRouterApiKey.value = settings.openRouterApiKey;
      }
      if (settings.agentsModel !== undefined) {
        _agentsModel.value = isValidModel(settings.agentsModel, "agents")
          ? settings.agentsModel
          : DEFAULT_AGENTS_MODEL;
      }
      if (settings.floatModel !== undefined) {
        _floatModel.value = isValidModel(settings.floatModel, "float")
          ? settings.floatModel
          : DEFAULT_FLOAT_MODEL;
      }
      if (settings.renamingModel !== undefined) {
        _renamingModel.value = isValidModel(settings.renamingModel, "renaming")
          ? settings.renamingModel
          : DEFAULT_RENAMING_MODEL;
      }
      if (settings.reasoningConfig !== undefined) {
        reasoningConfig.value = settings.reasoningConfig;
      }
      if (settings.customPrompts !== undefined) {
        customPrompts.value = settings.customPrompts;
      }
      if (settings.maxIterations !== undefined) {
        _maxIterations.value = settings.maxIterations;
      }
      if (settings.aiSessionRenaming !== undefined) {
        _aiSessionRenaming.value = settings.aiSessionRenaming;
      }
      if (settings.projectLearningsById !== undefined) {
        projectLearningsById.value = normalizeLearningsRecord(
          settings.projectLearningsById,
        );
      } else if (settings.projectMemoryById !== undefined) {
        projectLearningsById.value = convertLegacyMemoryRecord(
          settings.projectMemoryById,
        );
      }
      if (settings.projectHistoryById !== undefined) {
        projectHistoryById.value = settings.projectHistoryById;
      }
      if (settings.projectSpecificPromptsById !== undefined) {
        projectSpecificPromptsById.value = settings.projectSpecificPromptsById;
      }
      if (settings.projectAutoExecuteCollectionsById !== undefined) {
        projectAutoExecuteCollectionsById.value =
          settings.projectAutoExecuteCollectionsById;
      }
      if (settings.projectJitInstructionsById !== undefined) {
        projectJitInstructionsById.value = settings.projectJitInstructionsById;
      }
      if (settings.projectShiftCollectionAutoCreateById !== undefined) {
        projectShiftCollectionAutoCreateById.value =
          settings.projectShiftCollectionAutoCreateById;
      }
    }
  });

  const getHistory = () => {
    return projectHistoryById.value[_projectId.value] ?? [];
  };

  const addHistoryEntry = async (entry: string) => {
    const id = _projectId.value;
    const current = projectHistoryById.value[id] ?? [];
    const next = [...current, entry];
    if (next.length > 20) {
      next.splice(0, next.length - 20);
    }
    projectHistoryById.value = { ...projectHistoryById.value, [id]: next };
    await saveSettings();
  };


  const selectedModel = computed(() => {
    return models
      .flatMap((group) => group.items)
      .find((item) => item.id === _agentsModel.value);
  });

  const setAISessionRenaming = async (config: AISessionRenamingConfig) => {
    _aiSessionRenaming.value = config;
    await saveSettings();
  };

  const updateAISessionRenaming = async (
    updates: Partial<AISessionRenamingConfig>,
  ) => {
    _aiSessionRenaming.value = { ..._aiSessionRenaming.value, ...updates };
    await saveSettings();
  };

  const getProjectSpecificPrompt = (promptId: string): string => {
    const projectId = _projectId.value;
    return projectSpecificPromptsById.value[projectId]?.[promptId] ?? "";
  };

  const setProjectSpecificPrompt = async (
    promptId: string,
    content: string,
  ) => {
    const projectId = _projectId.value;
    projectSpecificPromptsById.value = {
      ...projectSpecificPromptsById.value,
      [projectId]: {
        ...projectSpecificPromptsById.value[projectId],
        [promptId]: content,
      },
    };
    await saveSettings();
  };

  const getProjectAutoExecuteCollection = (promptId: string): string => {
    const projectId = _projectId.value;
    return projectAutoExecuteCollectionsById.value[projectId]?.[promptId] ?? "";
  };

  const setProjectAutoExecuteCollection = async (
    promptId: string,
    collectionName: string,
  ) => {
    const projectId = _projectId.value;
    projectAutoExecuteCollectionsById.value = {
      ...projectAutoExecuteCollectionsById.value,
      [projectId]: {
        ...projectAutoExecuteCollectionsById.value[projectId],
        [promptId]: collectionName,
      },
    };
    await saveSettings();
  };

  const getProjectJitInstructions = (promptId: string): boolean => {
    const projectId = _projectId.value;
    return projectJitInstructionsById.value[projectId]?.[promptId] ?? false;
  };

  const setProjectJitInstructions = async (
    promptId: string,
    enabled: boolean,
  ) => {
    const projectId = _projectId.value;
    projectJitInstructionsById.value = {
      ...projectJitInstructionsById.value,
      [projectId]: {
        ...projectJitInstructionsById.value[projectId],
        [promptId]: enabled,
      },
    };
    await saveSettings();
  };

  return {
    openRouterApiKey,
    maxIterations,
    agentsModel,
    floatModel,
    renamingModel,
    learnings,
    setLearnings,
    addLearning,
    updateLearning,
    removeLearnings,
    clearLearnings,
    models,
    reasoningConfig,
    aiSessionRenaming,
    selectedModel,
    setReasoningConfig,
    updateReasoningConfig,
    getHistory,
    addHistoryEntry,
    setAISessionRenaming,
    updateAISessionRenaming,
    customPrompts,
    addCustomPrompt,
    updateCustomPrompt,
    deleteCustomPrompt,
    getProjectSpecificPrompt,
    setProjectSpecificPrompt,
    getProjectAutoExecuteCollection,
    setProjectAutoExecuteCollection,
    getProjectJitInstructions,
    setProjectJitInstructions,
    autoCreateShiftCollection,
  };
});
