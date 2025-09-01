<script setup lang="ts">
import Error from "./Error.vue";
import NoMessages from "./NoMessages.vue";
import NoSelection from "./NoSelection.vue";
import Success from "./Success.vue";
import { useContent } from "./useContent";

const { hasMessages, hasSelectedAgent, error } = useContent();
</script>

<template>
  <NoSelection v-if="!hasSelectedAgent" />
  <NoMessages v-else-if="!hasMessages" />
  <Error v-else-if="error" />
  <Success v-else />
</template>
