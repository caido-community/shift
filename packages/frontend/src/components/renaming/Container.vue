<script setup lang="ts">
import Checkbox from "primevue/checkbox";
import Textarea from "primevue/textarea";
import { computed } from "vue";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";
import { useConfigStore } from "@/stores/config";

const config = useConfigStore();

const enabled = computed({
  get() {
    return config.aiSessionRenaming.enabled;
  },
  set(value: boolean) {
    config.updateAISessionRenaming({ enabled: value });
  },
});

const renameAfterSend = computed({
  get() {
    return config.aiSessionRenaming.renameAfterSend;
  },
  set(value: boolean) {
    config.updateAISessionRenaming({ renameAfterSend: value });
  },
});

const instructions = computed({
  get() {
    return config.aiSessionRenaming.instructions;
  },
  set(value: string) {
    config.updateAISessionRenaming({ instructions: value });
  },
});
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">Enable AI Session Renaming</label>
        <p class="text-sm text-surface-400">
          Automatically name replay tabs using AI.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="enabled" binary />
        <span class="text-sm">Enabled</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">Rename again after sending</label>
        <p class="text-sm text-surface-400">
          Trigger a second rename when the session is sent in case the request
          was edited.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="renameAfterSend" :disabled="!enabled" binary />
        <span class="text-sm">Also rename after sending the session</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium"
          >Explain format in natural language</label
        >
        <p class="text-sm text-surface-400">
          Provide guidelines for how tabs should be named.
        </p>
      </div>
      <Textarea
        v-model="instructions"
        :disabled="!enabled"
        rows="8"
        class="w-full"
        placeholder="Provide custom instructions for how tabs should be renamed..."
      />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <label class="text-base font-medium">Model for Renaming</label>
        <p class="text-sm text-surface-400">
          Select which model to use for session tab names. We recommend using a
          cheap, small model as this will be called frequently.
        </p>
      </div>
      <div class="w-full max-w-md py-2">
        <ModelSelector variant="renaming" :disabled="!enabled" />
      </div>
    </div>
  </div>
</template>
