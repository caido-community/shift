<script setup lang="ts">
import { ChatContent } from "./ChatContent";
import { ChatError } from "./ChatError";
import { ChatInput } from "./ChatInput";
import { ChatQueue } from "./ChatQueue";
import { ChatTopbar } from "./ChatTopbar";
import { useSession } from "./useSession";

const { phase } = useSession();
</script>

<template>
  <div class="flex flex-col h-full">
    <ChatTopbar class="flex-shrink-0 px-1.5" />
    <ChatContent class="flex-1 min-h-0 pl-2" />
    <div class="flex-shrink-0">
      <ChatError v-if="phase === 'error'" />
      <ChatQueue />
      <ChatInput />
    </div>
  </div>
</template>
