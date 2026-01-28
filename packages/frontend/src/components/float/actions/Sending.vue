<script setup lang="ts">
import Button from "primevue/button";
import { ref } from "vue";

import { TextShimmer } from "@/components/common/TextShimmer";
import { useFloatStore } from "@/stores/float";
import { useAnimatedDots } from "@/utils";

const floatStore = useFloatStore();
const isActive = ref(true);
const generatingText = useAnimatedDots("Generating", isActive);
</script>

<template>
  <div class="w-full h-5 flex items-center justify-between">
    <TextShimmer class="text-xs font-mono">{{ generatingText }}</TextShimmer>

    <Button
      severity="tertiary"
      icon="fas fa-stop-circle"
      class="hover:text-white"
      :pt:root="{
        style: {
          width: 'fit-content',
          padding: '0 0.05rem',
        },
      }"
      @mousedown.stop
      @click="floatStore.stopQuery" />
  </div>
</template>
