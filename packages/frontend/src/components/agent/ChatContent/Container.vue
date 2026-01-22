<script setup lang="ts">
import Content from "./Content.vue";
import NoMessages from "./NoMessages.vue";
import NoProviderConfigured from "./NoProviderConfigured.vue";
import { useContent } from "./useContent";

const { hasProviderConfigured, hasMessages } = useContent();
</script>

<template>
  <NoProviderConfigured v-if="!hasProviderConfigured" />
  <NoMessages v-else-if="!hasMessages" />
  <Content v-else />
</template>
