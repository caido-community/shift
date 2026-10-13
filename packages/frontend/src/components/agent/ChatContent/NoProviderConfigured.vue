<script setup lang="ts">
import Button from "primevue/button";

import { useSDK } from "@/plugins/sdk";

const sdk = useSDK();
</script>

<template>
  <div class="flex-1 flex items-center justify-center text-surface-400">
    <div class="flex flex-col items-center text-center">
      <i class="fas fa-plug-circle-xmark text-4xl mb-2" />
      <div class="text-lg">No AI provider configured</div>
      <div class="text-sm mt-1">Add a provider in Caido settings, under AI</div>
      <Button
        label="Open Caido settings"
        icon="fas fa-key"
        size="small"
        severity="secondary"
        class="mt-3"
        @click="sdk.navigation.goTo('/settings')" />
    </div>
  </div>
</template>
