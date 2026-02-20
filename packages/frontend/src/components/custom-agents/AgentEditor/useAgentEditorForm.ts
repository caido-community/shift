import type {
  CreateCustomAgentInput,
  CustomAgent,
  CustomAgentBinary,
  SkillScope,
  UpdateCustomAgentInput,
} from "shared";
import { computed, type MaybeRefOrGetter, ref, toValue, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useSkillsStore } from "@/stores/skills";

export type AgentEditorBinary = {
  path: string;
  instructions: string;
};

type AgentEditorSubmitResult =
  | { kind: "create"; input: CreateCustomAgentInput }
  | { kind: "update"; id: string; input: UpdateCustomAgentInput };

const scopeOptions: Array<{ label: string; value: SkillScope }> = [
  { label: "Project", value: "project" },
  { label: "Global", value: "global" },
];

export const useAgentEditorForm = (agentSource: MaybeRefOrGetter<CustomAgent | undefined>) => {
  const sdk = useSDK();
  const skillsStore = useSkillsStore();
  const customAgentsStore = useCustomAgentsStore();
  const agent = computed(() => toValue(agentSource));

  const name = ref("");
  const description = ref("");
  const instructions = ref("");
  const scope = ref<SkillScope>("project");
  const selectedSkillIds = ref<string[]>([]);
  const selectedWorkflowIds = ref<string[]>([]);
  const allWorkflowsEnabled = ref(true);
  const selectedBinaries = ref<AgentEditorBinary[]>([]);
  const selectedCollections = ref<string[]>([]);

  const isEditing = computed(() => agent.value !== undefined);
  const formTitle = computed(() => (isEditing.value ? "Edit Agent" : "New Agent"));
  const saveButtonLabel = computed(() => (isEditing.value ? "Save" : "Create"));

  const skillOptions = computed(() =>
    skillsStore.definitions.map((definition) => ({
      label: definition.title,
      value: definition.id,
    }))
  );

  const workflowOptions = computed(() =>
    sdk.workflows
      .getWorkflows()
      .filter((workflow) => workflow.kind === "Convert")
      .map((workflow) => ({
        label: workflow.name,
        value: workflow.id,
      }))
  );

  const collectionOptions = computed(() =>
    sdk.replay.getCollections().map((collection) => ({
      label: collection.name,
      value: collection.name,
    }))
  );

  const occupiedCollectionOwners = computed(() => {
    const occupied = new Map<string, string>();
    for (const definition of customAgentsStore.definitions) {
      if (agent.value !== undefined && definition.id === agent.value.id) {
        continue;
      }
      for (const collectionName of definition.boundCollections) {
        if (!occupied.has(collectionName)) {
          occupied.set(collectionName, definition.name);
        }
      }
    }
    return occupied;
  });

  const conflictingCollections = computed(() =>
    selectedCollections.value.filter((collectionName) =>
      occupiedCollectionOwners.value.has(collectionName)
    )
  );

  const canSave = computed(() => name.value.trim() !== "");

  const resetForm = () => {
    name.value = "";
    description.value = "";
    instructions.value = "";
    scope.value = "project";
    selectedSkillIds.value = [];
    selectedWorkflowIds.value = [];
    allWorkflowsEnabled.value = true;
    selectedBinaries.value = [];
    selectedCollections.value = [];
  };

  const applyAgentToForm = (value: CustomAgent) => {
    name.value = value.name;
    description.value = value.description;
    instructions.value = value.instructions;
    scope.value = value.scope;
    selectedSkillIds.value = [...value.skillIds];
    allWorkflowsEnabled.value = value.allowedWorkflowIds === undefined;
    selectedWorkflowIds.value = value.allowedWorkflowIds ?? [];
    selectedBinaries.value = (value.allowedBinaries ?? []).map((binary) => ({
      path: binary.path,
      instructions: binary.instructions ?? "",
    }));
    selectedCollections.value = [...value.boundCollections];
  };

  watch(
    agent,
    (nextAgent) => {
      if (nextAgent === undefined) {
        resetForm();
        return;
      }
      applyAgentToForm(nextAgent);
    },
    { immediate: true }
  );

  const showCollectionConflict = (collectionName: string) => {
    const owner = occupiedCollectionOwners.value.get(collectionName);
    const message =
      owner === undefined
        ? `Collection "${collectionName}" is already bound to another agent`
        : `Collection "${collectionName}" is already bound to "${owner}"`;
    sdk.window.showToast(message, { variant: "error" });
  };

  const setSelectedCollections = (value: string[]) => {
    const added = value.find(
      (collectionName) =>
        !selectedCollections.value.includes(collectionName) &&
        occupiedCollectionOwners.value.has(collectionName)
    );

    if (added !== undefined) {
      showCollectionConflict(added);
      return;
    }

    selectedCollections.value = value;
  };

  const buildBaseInput = () => ({
    name: name.value.trim(),
    description: description.value.trim(),
    instructions: instructions.value.trim(),
    scope: scope.value,
    skillIds: [...selectedSkillIds.value],
    boundCollections: [...selectedCollections.value],
  });

  const buildAllowedBinaries = (): CustomAgentBinary[] =>
    selectedBinaries.value
      .map((binary) => {
        const path = binary.path.trim();
        const trimmedInstructions = binary.instructions.trim();
        return {
          path,
          instructions: trimmedInstructions === "" ? undefined : trimmedInstructions,
        };
      })
      .filter((binary) => binary.path !== "");

  const buildSubmitResult = (): AgentEditorSubmitResult | undefined => {
    if (!canSave.value) {
      return undefined;
    }

    const firstConflict = conflictingCollections.value[0];
    if (firstConflict !== undefined) {
      showCollectionConflict(firstConflict);
      return undefined;
    }

    const baseInput = buildBaseInput();
    const allowedWorkflowIds = [...selectedWorkflowIds.value];
    const allowedBinaries = buildAllowedBinaries();

    if (agent.value !== undefined) {
      return {
        kind: "update",
        id: agent.value.id,
        input: {
          ...baseInput,
          allowedWorkflowIds: allWorkflowsEnabled.value ? null : allowedWorkflowIds,
          allowedBinaries: allowedBinaries.length === 0 ? null : allowedBinaries,
        },
      };
    }

    return {
      kind: "create",
      input: {
        ...baseInput,
        allowedWorkflowIds: allWorkflowsEnabled.value ? undefined : allowedWorkflowIds,
        allowedBinaries: allowedBinaries.length === 0 ? undefined : allowedBinaries,
      },
    };
  };

  return {
    name,
    description,
    instructions,
    scope,
    selectedSkillIds,
    selectedWorkflowIds,
    allWorkflowsEnabled,
    selectedBinaries,
    selectedCollections,
    isEditing,
    formTitle,
    saveButtonLabel,
    canSave,
    scopeOptions,
    skillOptions,
    workflowOptions,
    collectionOptions,
    setSelectedCollections,
    buildSubmitResult,
  };
};
