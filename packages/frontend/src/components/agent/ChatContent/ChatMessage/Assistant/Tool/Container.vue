<script setup lang="ts">
import type { MessageMetadata, PartState } from "shared";

import GenericTool from "./Generic.vue";
import { TodoAddTool } from "./TodoAdd";

const { toolName, partState, messageMetadata, input, output, errorText } = defineProps<{
  toolName: string;
  partState: PartState;
  messageMetadata: MessageMetadata | undefined;
  input: unknown;
  output: unknown;
  errorText: string | undefined;
}>();
</script>

<template>
  <TodoAddTool
    v-if="toolName === 'TodoAdd'"
    :part-state="partState"
    :message-metadata="messageMetadata"
    :output="output"
    class="select-none" />
  <GenericTool
    v-else
    :tool-name="toolName"
    :part-state="partState"
    :message-metadata="messageMetadata"
    :input="input"
    :output="output"
    :error-text="errorText"
    class="select-none" />
</template>
