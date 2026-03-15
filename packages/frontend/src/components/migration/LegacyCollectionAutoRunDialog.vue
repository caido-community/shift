<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import type { LegacyCollectionAutoRunMigrationSummary } from "shared";
import { computed } from "vue";

const { summary } = defineProps<{
  summary: LegacyCollectionAutoRunMigrationSummary;
}>();

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  dismiss: [];
  openAgents: [];
}>();

const hasVisibleEntries = computed(() => summary.entries.length > 0);

const handleDismiss = () => {
  emit("dismiss");
};

const handleOpenAgents = () => {
  emit("openAgents");
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Collection Auto-Run Removed"
    :closable="false"
    :close-on-escape="false"
    :style="{ width: '40rem' }">
    <div class="flex flex-col gap-4">
      <p class="text-sm text-surface-300">
        Shift removed the legacy skill collection auto-run behavior in this release. The bindings
        below were cleaned up and those skills will no longer auto-run when a replay session lands
        in that collection.
      </p>

      <p class="text-sm text-surface-300">
        Collection-based automation now belongs to custom agents. Create or update an agent and bind
        the collection there to restore the old workflow.
      </p>

      <div
        v-if="hasVisibleEntries"
        class="flex max-h-60 flex-col gap-2 overflow-y-auto rounded-md border border-surface-700 bg-surface-900/40 p-3">
        <div
          v-for="entry in summary.entries"
          :key="`${entry.skillId}-${entry.collectionName}`"
          class="rounded-md border border-surface-700/80 bg-surface-800/50 px-3 py-2">
          <div class="flex items-center justify-between gap-4">
            <span class="font-medium text-surface-100">{{ entry.title }}</span>
            <span class="text-xs uppercase tracking-wide text-surface-400">
              {{ entry.scope === "global" ? "Global" : "Project" }}
            </span>
          </div>
          <p class="mt-1 text-sm text-surface-300">
            Previously auto-ran in
            <span class="font-mono text-surface-100">{{ entry.collectionName }}</span>
          </p>
        </div>
      </div>

      <p
        v-if="summary.hiddenProjectScopedCount > 0"
        class="text-sm text-surface-400">
        {{ summary.hiddenProjectScopedCount }}
        project-scoped skill{{ summary.hiddenProjectScopedCount === 1 ? "" : "s" }} from other
        projects were also cleaned up.
      </p>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button
          label="Dismiss"
          severity="secondary"
          text
          @click="handleDismiss" />
        <Button
          label="Open Agents"
          icon="fas fa-robot"
          @click="handleOpenAgents" />
      </div>
    </template>
  </Dialog>
</template>
