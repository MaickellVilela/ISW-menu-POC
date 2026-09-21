<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useSourceDefinition } from '~/composables/sourceDefinition';

export type DataSourceSection = 'canvas' | 'settings';

const props = defineProps<{
  section: DataSourceSection;
  sourceName?: string;
}>();

const { definition, load } = useSourceDefinition();
const displayName = computed(() => props.sourceName?.trim() || definition.value.name);

onMounted(() => {
  load();
});
</script>

<template>
  <header class="flex h-14 flex-shrink-0 items-center gap-6 border-b border-[#E2E2E2] bg-white px-5">
    <div class="flex min-w-0 items-center gap-2.5">
      <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#F1ECFA] text-[#3B1770]">
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
          <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      </span>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-[#25262E]">{{ displayName }}</p>
        <p class="text-[10px] text-[#9A9A9A]">
          {{ section === 'canvas' ? 'Source canvas' : 'Configuration' }}
        </p>
      </div>
    </div>
  </header>
</template>
