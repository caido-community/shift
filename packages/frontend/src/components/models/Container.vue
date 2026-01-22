<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import Tooltip from "primevue/tooltip";

import { AddModelDialog } from "./AddModelDialog";
import { useModels } from "./useModels";

const {
  searchQuery,
  isAddModalVisible,
  filteredModels,
  toggleModel,
  toggleModelForFloat,
  toggleModelForAgent,
  addCustomModel,
  isCustomModel,
  deleteModel,
  providers,
  selectedProvider,
} = useModels();

const vTooltip = Tooltip;
</script>

<template>
  <div class="flex flex-col h-full gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold">Models</h2>
            <p class="text-sm text-surface-400">Configure AI models and providers for Shift.</p>
          </div>
          <div class="flex items-center gap-2">
            <Select
              v-model="selectedProvider"
              :options="providers"
              option-label="label"
              option-value="value"
              class="w-36" />
            <Button
              label="Add Custom Model"
              icon="fas fa-plus"
              size="small"
              @click="isAddModalVisible = true" />
          </div>
        </div>
      </template>
    </Card>

    <Card
      class="h-full min-h-0"
      :pt:body="{ class: 'h-full p-0' }"
      :pt:content="{ class: 'h-full overflow-hidden' }">
      <template #content>
        <div class="p-4 flex flex-col gap-4 overflow-hidden h-full">
          <IconField class="w-full">
            <InputIcon class="fas fa-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Add or search model"
              class="w-full" />
          </IconField>

          <div class="flex flex-col overflow-y-auto pr-2 overflow-auto">
            <template
              v-for="(model, index) in filteredModels"
              :key="model.id">
              <div
                class="flex items-center justify-between p-3 bg-surface-800 rounded-md hover:bg-surface-700 transition-colors duration-200">
                <div class="flex items-center gap-3">
                  <div class="flex gap-2 items-center">
                    <span class="font-medium text-sm">{{ model.name }}</span>
                    <span class="text-xs text-surface-400">{{ model.id }}</span>
                  </div>
                  <i
                    v-if="model.capabilities.reasoning"
                    v-tooltip.top="'Reasoning Model'"
                    class="fas fa-brain text-surface-400 text-xs"></i>
                </div>

                <div class="flex items-center gap-3">
                  <Button
                    v-if="isCustomModel(model)"
                    v-tooltip.top="'Delete custom model'"
                    icon="fas fa-trash"
                    severity="danger"
                    size="small"
                    text
                    @click="deleteModel(model)" />
                  <div
                    v-else
                    class="w-8"></div>
                  <div
                    v-tooltip.top="'Show in Float selector'"
                    class="flex items-center gap-1.5 cursor-pointer select-none"
                    :class="{ 'opacity-40': !model.enabled }"
                    @click="model.enabled && toggleModelForFloat(model)">
                    <Checkbox
                      :model-value="model.enabledForFloat"
                      :disabled="!model.enabled"
                      binary
                      @click.stop
                      @update:model-value="toggleModelForFloat(model)" />
                    <span class="text-xs text-surface-400">Float</span>
                  </div>
                  <div
                    v-tooltip.top="'Show in Agent selector'"
                    class="flex items-center gap-1.5 cursor-pointer select-none"
                    :class="{ 'opacity-40': !model.enabled }"
                    @click="model.enabled && toggleModelForAgent(model)">
                    <Checkbox
                      :model-value="model.enabledForAgent"
                      :disabled="!model.enabled"
                      binary
                      @click.stop
                      @update:model-value="toggleModelForAgent(model)" />
                    <span class="text-xs text-surface-400">Agent</span>
                  </div>
                  <ToggleSwitch
                    :model-value="model.enabled"
                    @update:model-value="toggleModel(model)" />
                </div>
              </div>
              <div
                v-if="index < filteredModels.length - 1"
                class="border-b border-surface-700"></div>
            </template>
            <div
              v-if="filteredModels.length === 0"
              class="text-center text-surface-400 mt-4">
              No models found.
            </div>
          </div>
        </div>
      </template>
    </Card>

    <AddModelDialog
      v-model:visible="isAddModalVisible"
      :initial-provider="selectedProvider"
      @add="addCustomModel" />
  </div>
</template>
