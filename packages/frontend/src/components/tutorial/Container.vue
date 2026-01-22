<script setup lang="ts">
import Card from "primevue/card";

import AgentsIntro from "./AgentsIntro.vue";
import CoreIntro from "./FloatIntro.vue";
</script>

<template>
  <div class="flex flex-col h-full gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold">Tutorial</h2>
            <p class="text-sm text-surface-400">Learn how to use Shift Agents and Core.</p>
          </div>
        </div>
      </template>
    </Card>

    <Card
      class="h-full min-h-0"
      :pt:body="{ class: 'h-full p-0' }"
      :pt:content="{ class: 'h-full overflow-hidden' }">
      <template #content>
        <div class="h-full p-4 overflow-auto">
          <div class="border border-surface-600 rounded-lg p-4 mb-4">
            <h2 class="text-xl font-semibold mb-2">What is Shift?</h2>
            <p class="text-sm text-surface-300">
              Shift is an AI plugin that integrates state-of-the-art LLMs directly into Caido's UI.
              It enables LLM-powered free-form HTTP modification in Replay, automatic
              contextualization of queries, and supports many tools that the AI can use to interface
              with Caido.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-4 h-fit">
            <div class="border border-surface-600 rounded-lg p-4 group cursor-pointer">
              <div class="mb-4">
                <h3 class="text-lg font-semibold">Shift Core — Floating AI Modal</h3>
                <p class="text-sm text-surface-300">
                  Quickly query AI inside Caido and let it take actions for you.
                </p>
              </div>
              <div
                class="intro-media h-fit w-full overflow-hidden transition-transform duration-200 transform-gpu group-hover:scale-[1.03]">
                <CoreIntro />
              </div>
            </div>

            <div class="border border-surface-600 rounded-lg p-4 group cursor-pointer">
              <div class="mb-4">
                <h3 class="text-lg font-semibold">Shift Agents — Micro‑agent Framework</h3>
                <p class="text-sm text-surface-300">
                  Compose small tools that collaborate to automate replay and workflows.
                </p>
              </div>
              <div
                class="intro-media h-fit w-full overflow-hidden transition-transform duration-200 transform-gpu group-hover:scale-[1.03]">
                <AgentsIntro />
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.intro-media :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
