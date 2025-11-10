<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";

import { useForm } from "./useForm";

import { useConfigStore } from "@/stores/config";

const {
  isApiKeyVisible,
  isValidating,
  toggleApiKeyVisibility,
  validateApiKey,
} = useForm();

const config = useConfigStore();
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">OpenRouter API Key</label>
        <p class="text-sm text-surface-400">
          Enter your OpenRouter API key to enable AI model access.
        </p>
      </div>

      <div class="flex gap-3">
        <IconField class="flex-1">
          <InputIcon class="fas fa-key" />
          <InputText
            v-model="config.openRouterApiKey"
            :type="isApiKeyVisible ? 'text' : 'password'"
            placeholder="Enter API key"
            class="w-full"
          />
        </IconField>
        <Button
          :icon="isApiKeyVisible ? 'fas fa-eye-slash' : 'fas fa-eye'"
          severity="secondary"
          outlined
          @click="toggleApiKeyVisibility"
        />
        <Button
          icon="fas fa-check-circle"
          label="Validate"
          :disabled="!config.openRouterApiKey?.trim()"
          :loading="isValidating"
          @click="validateApiKey"
        />
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">Max Iterations</label>
        <p class="text-sm text-surface-400">
          Enter the maximum number of iterations for AI model.
        </p>
      </div>

      <InputNumber
        v-model="config.maxIterations"
        placeholder="Enter max iterations"
      />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium" for="shift-auto-create">
          Auto-create Shift Collection
        </label>
        <p class="text-sm text-surface-400">
          Automatically create the Shift collection for this project when needed.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Checkbox
          inputId="shift-auto-create"
          v-model="config.autoCreateShiftCollection"
          binary
        />
        <label class="text-sm" for="shift-auto-create">Enable auto-create</label>
      </div>
    </div>
  </div>
</template>
