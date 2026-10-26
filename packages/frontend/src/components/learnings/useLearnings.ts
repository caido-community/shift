import { type Result } from "shared";
import { computed, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useLearningsStore } from "@/stores/learnings";

type Edit = { original: string; draft: string };

export const useLearnings = () => {
  const sdk = useSDK();
  const learningsStore = useLearningsStore();

  const entries = computed(() => learningsStore.entries);
  const edits = ref(new Map<number, Edit>());
  const selectedIndexes = ref<number[]>([]);
  const pendingIndexes = ref(new Set<number>());
  const newLearning = ref("");
  const isAdding = ref(false);

  // Entries change under us (agents, other rows saving); drop only edits whose row no longer matches.
  watch(entries, (next) => {
    for (const [index, edit] of edits.value) {
      if (next[index] !== edit.original) edits.value.delete(index);
    }
  });

  const notifyFailure = (result: Result<void>) => {
    if (result.kind === "Error") sdk.window.showToast(result.error, { variant: "error" });
    return result.kind === "Ok";
  };

  const draftOf = (index: number) => edits.value.get(index)?.draft ?? entries.value[index] ?? "";

  const setDraft = (index: number, draft: string) => {
    const original = edits.value.get(index)?.original ?? entries.value[index] ?? "";
    edits.value.set(index, { original, draft });
  };

  const isPending = (index: number) => pendingIndexes.value.has(index);

  const commitLearning = async (index: number) => {
    const edit = edits.value.get(index);
    if (edit === undefined) return;
    if (edit.draft === edit.original) {
      edits.value.delete(index);
      return;
    }

    pendingIndexes.value.add(index);
    try {
      notifyFailure(await learningsStore.update(index, edit.draft));
    } finally {
      pendingIndexes.value.delete(index);
    }
  };

  const addLearning = async () => {
    if (newLearning.value.trim() === "" || isAdding.value) return;

    isAdding.value = true;
    try {
      if (notifyFailure(await learningsStore.add(newLearning.value))) newLearning.value = "";
    } finally {
      isAdding.value = false;
    }
  };

  const isSelected = (index: number) => selectedIndexes.value.includes(index);
  const allSelected = computed(
    () => entries.value.length > 0 && entries.value.every((_, index) => isSelected(index))
  );

  const toggleSelected = (index: number) => {
    selectedIndexes.value = isSelected(index)
      ? selectedIndexes.value.filter((selected) => selected !== index)
      : [...selectedIndexes.value, index];
  };

  const toggleSelectAll = () => {
    selectedIndexes.value = allSelected.value ? [] : entries.value.map((_, index) => index);
  };

  const removeLearnings = async (indexes: number[]) => {
    if (indexes.length === 0) return;
    notifyFailure(await learningsStore.remove(indexes));
    selectedIndexes.value = [];
  };

  const clearAll = async () => {
    if (entries.value.length === 0) return;
    if (!window.confirm("Are you sure you want to delete all learnings? This cannot be undone.")) {
      return;
    }
    notifyFailure(await learningsStore.clear());
    selectedIndexes.value = [];
  };

  return {
    entries,
    selectedIndexes,
    newLearning,
    isAdding,
    allSelected,
    draftOf,
    setDraft,
    isPending,
    isSelected,
    commitLearning,
    addLearning,
    toggleSelected,
    toggleSelectAll,
    removeLearnings,
    clearAll,
  };
};
