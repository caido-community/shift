import { defineStore } from "pinia";
import { Result } from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";

export const useLearningsStore = defineStore("learnings", () => {
  const sdk = useSDK();
  const entries = ref<string[]>([]);

  async function initialize(): Promise<Result<void>> {
    const result = await sdk.backend.getLearnings();
    if (result.kind === "Error") return result;
    entries.value = result.value.entries;
    return Result.ok(undefined);
  }

  async function add(content: string): Promise<Result<void>> {
    const result = await sdk.backend.addLearning({ content });
    if (result.kind === "Error") return result;
    entries.value = result.value.entries;
    return Result.ok(undefined);
  }

  async function update(index: number, content: string): Promise<Result<void>> {
    const result = await sdk.backend.updateLearning({ index, content });
    if (result.kind === "Error") return result;
    entries.value = result.value.entries;
    return Result.ok(undefined);
  }

  async function remove(indexes: number[]): Promise<Result<void>> {
    const result = await sdk.backend.removeLearnings({ indexes });
    if (result.kind === "Error") return result;
    entries.value = result.value.entries;
    return Result.ok(undefined);
  }

  async function clear(): Promise<Result<void>> {
    const result = await sdk.backend.clearLearnings();
    if (result.kind === "Error") return result;
    entries.value = result.value.entries;
    return Result.ok(undefined);
  }

  return {
    entries: computed(() => entries.value),
    initialize,
    add,
    update,
    remove,
    clear,
  };
});
