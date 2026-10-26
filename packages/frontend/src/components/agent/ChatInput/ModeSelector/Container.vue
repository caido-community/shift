<script setup lang="ts">
import { useSession } from "../../useSession";
import OptionSelector from "../OptionSelector.vue";

import { AGENT_MODES } from "@/components/agent/modes";

const session = useSession();
</script>

<template>
  <OptionSelector
    :options="AGENT_MODES"
    :selected="session.store.mode"
    @select="session.store.setMode" />
</template>
