<script setup lang="ts">
import type { MessageMetadata, PartState } from "shared";

import { BinaryExecRunTool } from "./BinaryExecRun";
import GenericTool from "./Generic.vue";
import { TodoAddTool } from "./TodoAdd";

const { toolName, toolCallId, partState, messageMetadata, input, output, errorText } = defineProps<{
  toolName: string;
  toolCallId: string;
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
  <BinaryExecRunTool
    v-else-if="toolName === 'BinaryExecRun'"
    :tool-call-id="toolCallId"
    :part-state="partState"
    :message-metadata="messageMetadata"
    :input="input"
    :output="output"
    :error-text="errorText"
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
