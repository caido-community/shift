<script setup lang="ts">
import Checkbox from "primevue/checkbox";
import Dropdown from "primevue/dropdown";
import InputNumber from "primevue/inputnumber";

import { Provider } from "@/agents/types/config";
import { useConfigStore } from "@/stores/config";
import { useModelsStore } from "@/stores/models";

const configStore = useConfigStore();
const modelsStore = useModelsStore();

const providers = Object.values(Provider).map((p) => ({ label: p, value: p }));
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">Provider</label>
        <p class="text-sm text-surface-400">Select the AI provider to use.</p>
      </div>
      <Dropdown
        v-model="modelsStore.selectedProvider"
        :options="providers"
        option-label="label"
        option-value="value"
        class="w-full"
      />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">Max Iterations</label>
        <p class="text-sm text-surface-400">
          Enter the maximum number of iterations for AI model.
        </p>
      </div>

      <InputNumber
        v-model="configStore.maxIterations"
        placeholder="Enter max iterations"
        class="w-full"
      />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium" for="shift-auto-create">
          Auto-create Shift Collection
        </label>
        <p class="text-sm text-surface-400">
          Automatically create the Shift collection for this project when
          needed.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Checkbox
          v-model="configStore.autoCreateShiftCollection"
          input-id="shift-auto-create"
          binary
        />
        <label class="text-sm" for="shift-auto-create"
          >Enable auto-create</label
        >
      </div>
    </div>
  </div>
</template>
