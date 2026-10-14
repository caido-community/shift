<script setup lang="ts">
import { useSession } from "../useSession";

const STARTER_PROMPTS = [
  "Explain what this request does",
  "Test for IDOR and missing authorization",
  "Probe each parameter for injection",
  "Look for hidden parameters",
];

const session = useSession();
</script>

<template>
  <div class="flex flex-col justify-end">
    <div class="flex flex-col items-start gap-1 px-1 pb-3 font-mono min-w-0">
      <div class="text-xs text-surface-500">Try</div>
      <button
        v-for="prompt in STARTER_PROMPTS"
        :key="prompt"
        type="button"
        class="group max-w-full truncate text-sm text-surface-400 hover:!text-surface-100 transition-colors"
        @click="session.draftMessage = prompt">
        <i
          class="fas fa-arrow-right text-[10px] text-surface-600 group-hover:!text-surface-300 transition-colors mr-2" />{{
          prompt
        }}
      </button>
    </div>
  </div>
</template>
