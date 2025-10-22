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

// TODO: cleanup the store, maybe split it up a bit
export const useConfigStore = defineStore("stores.config", () => {
  const sdk = useSDK();

  const customPrompts = ref<CustomPrompt[]>(defaultCustomPrompts);
  const _openRouterApiKey = ref<string>("");
  const _agentsModel = ref<string>("anthropic/claude-sonnet-4");
  const _floatModel = ref<string>("google/gemini-2.5-flash");
  const _renamingModel = ref<string>("google/gemini-flash-1.5");
  const _maxIterations = ref<number>(35);
  const projectMemoryById = ref<Record<string, string>>({});
  const projectHistoryById = ref<Record<string, string[]>>({});
  const projectSpecificPromptsById = ref<Record<string, Record<string, string>>>({});
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

  const getActiveProjectId = () => {
    const projectNameElement = document.querySelector(
      ".c-current-project[data-project-id]",
    );
    if (projectNameElement === null) {
      return "";
    }
    const id = projectNameElement.getAttribute("data-project-id");
    return id ?? "";
  };
  const _projectId = ref<string>(getActiveProjectId());

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
  const memory = computed({
    get() {
      return projectMemoryById.value[_projectId.value] ?? "";
    },
    set(value: string) {
      projectMemoryById.value = {
        ...projectMemoryById.value,
        [_projectId.value]: value,
      };
      saveSettings();
    },
  });
  const maxIterations = computed({
    get() {
      return _maxIterations.value;
    },
    set(value: number) {
      _maxIterations.value = value;
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

  const saveSettings = async () => {
    const settings: PluginStorage = {
      openRouterApiKey: _openRouterApiKey.value,
      agentsModel: _agentsModel.value,
      floatModel: _floatModel.value,
      renamingModel: _renamingModel.value,
      reasoningConfig: reasoningConfig.value,
      customPrompts: customPrompts.value,
      maxIterations: _maxIterations.value,
      aiSessionRenaming: _aiSessionRenaming.value,
      projectMemoryById: projectMemoryById.value,
      projectHistoryById: projectHistoryById.value,
      projectSpecificPromptsById: projectSpecificPromptsById.value,
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
        _agentsModel.value = settings.agentsModel;
      }
      if (settings.floatModel !== undefined) {
        _floatModel.value = settings.floatModel;
      }
      if (settings.renamingModel !== undefined) {
        _renamingModel.value = settings.renamingModel;
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
      if (settings.projectMemoryById !== undefined) {
        projectMemoryById.value = settings.projectMemoryById;
      }
      if (settings.projectHistoryById !== undefined) {
        projectHistoryById.value = settings.projectHistoryById;
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
        _agentsModel.value = settings.agentsModel;
      }
      if (settings.floatModel !== undefined) {
        _floatModel.value = settings.floatModel;
      }
      if (settings.renamingModel !== undefined) {
        _renamingModel.value = settings.renamingModel;
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
      if (settings.projectMemoryById !== undefined) {
        projectMemoryById.value = settings.projectMemoryById;
      }
      if (settings.projectHistoryById !== undefined) {
        projectHistoryById.value = settings.projectHistoryById;
      }
      if (settings.projectSpecificPromptsById !== undefined) {
        projectSpecificPromptsById.value = settings.projectSpecificPromptsById;
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

  const monitorProjectChanges = async () => {
    try {
      const iterator = sdk.graphql.updatedProject();
      for await (const _ of iterator) {
        // TODO: figure out a better way
        setTimeout(() => {
          _projectId.value = getActiveProjectId();
        }, 100);
      }
    } catch {
      // do nothing
    }
  };

  monitorProjectChanges();

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

  const setProjectSpecificPrompt = async (promptId: string, content: string) => {
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

  return {
    openRouterApiKey,
    maxIterations,
    agentsModel,
    floatModel,
    renamingModel,
    memory,
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
  };
});
