<script setup lang="ts" generic="T extends string">
import { onClickOutside } from "@vueuse/core";
import { computed, ref } from "vue";

type Option = { value: T; label: string; description?: string };

const {
  options,
  selected,
  muted = false,
} = defineProps<{
  options: Option[];
  selected: T;
  muted?: boolean;
}>();

const emit = defineEmits<{ select: [value: T] }>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement>();
const hovered = ref<{ description: string; top: number }>();

const selectedLabel = computed(
  () => options.find((option) => option.value === selected)?.label ?? ""
);

const close = () => {
  isOpen.value = false;
  hovered.value = undefined;
};

onClickOutside(containerRef, close);

const toggle = () => {
  if (isOpen.value) {
    close();
  } else {
    isOpen.value = true;
  }
};

const select = (value: T) => {
  emit("select", value);
  close();
};

const onOptionEnter = (option: Option, event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  hovered.value =
    option.description === undefined || option.description === ""
      ? undefined
      : { description: option.description, top: target.offsetTop + target.offsetHeight / 2 };
};
</script>

<template>
  <div
    ref="containerRef"
    class="relative">
    <button
      type="button"
      :class="[
        'flex items-center gap-1.5 px-1 py-1 text-sm rounded transition-colors cursor-pointer',
        muted
          ? 'text-surface-500 hover:text-surface-300'
          : 'text-surface-400 hover:text-surface-200',
        isOpen ? (muted ? 'text-surface-300' : 'text-surface-200') : '',
      ]"
      @click="toggle">
      <span class="truncate max-w-[120px]">{{ selectedLabel }}</span>
      <i
        :class="[
          'fas fa-chevron-down transition-transform text-[8px] text-surface-600',
          isOpen ? 'rotate-180' : '',
        ]" />
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div
        v-if="isOpen"
        class="absolute bottom-full mb-1 left-0 z-[10001] w-max min-w-32 max-w-56 rounded-lg border border-surface-700 bg-surface-900 shadow-xl">
        <div class="relative">
          <div class="max-h-64 overflow-y-auto py-1">
            <button
              v-for="option in options"
              :key="option.value"
              type="button"
              :class="[
                'w-full px-3 py-1.5 text-left text-sm transition-colors',
                option.value === selected
                  ? 'bg-surface-700/50 text-surface-100'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @mouseenter="onOptionEnter(option, $event)"
              @mouseleave="hovered = undefined"
              @click="select(option.value)">
              <div class="flex items-center justify-between gap-4">
                <span class="truncate">{{ option.label }}</span>
                <i
                  v-if="option.value === selected"
                  class="fas fa-check text-xs text-surface-400 shrink-0" />
              </div>
            </button>
          </div>
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 -translate-x-1"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-1">
            <div
              v-if="hovered !== undefined"
              :style="{ top: `${hovered.top}px` }"
              class="absolute right-full top-0 mr-1 w-max max-w-96 -translate-y-1/2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 text-[13px] text-surface-300 shadow-xl leading-relaxed whitespace-normal">
              {{ hovered.description }}
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>
