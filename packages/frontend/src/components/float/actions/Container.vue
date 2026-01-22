<script setup lang="ts">
import { storeToRefs } from "pinia";

import Idle from "@/components/float/actions/Idle.vue";
import Sending from "@/components/float/actions/Sending.vue";
import { useFloatStore } from "@/stores/float";

const floatStore = useFloatStore();
const { isRunning } = storeToRefs(floatStore);
</script>

<template>
  <Sending v-if="isRunning" />
  <Idle v-else />
</template>
