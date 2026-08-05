<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    meta?: string;
    defaultOpen?: boolean;
    /** When set, drives the open state (e.g. expand while the agent runs, collapse when done). */
    forceOpen?: boolean | null;
  }>(),
  { meta: '', defaultOpen: false, forceOpen: null },
);

const isOpen = ref(props.forceOpen ?? props.defaultOpen);

watch(
  () => props.forceOpen,
  (value) => {
    if (typeof value === 'boolean') isOpen.value = value;
  },
);
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-[#E2E2E2] bg-white">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#F8F6FC]"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-3.5 w-3.5 flex-shrink-0 text-[#9A9A9A] transition-transform"
        :class="isOpen ? 'rotate-90' : ''"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-[#25262E]">{{ title }}</span>
      <span v-if="meta" class="flex-shrink-0 text-xs text-[#9A9A9A]">{{ meta }}</span>
    </button>

    <!-- Kept mounted so long-running content (agent steps) survives collapsing. -->
    <div v-show="isOpen" class="border-t border-[#E2E2E2] px-3 py-3">
      <slot />
    </div>
  </div>
</template>
