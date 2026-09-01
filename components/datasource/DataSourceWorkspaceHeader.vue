<script setup lang="ts">
export type DataSourceSection = 'canvas' | 'cache';

export interface DataSourceSectionItem {
  id: DataSourceSection;
  label: string;
}

const SECTIONS: DataSourceSectionItem[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'cache', label: 'Cache' },
];

const props = defineProps<{
  section: DataSourceSection;
  sourceName?: string;
}>();

const emit = defineEmits<{
  'update:section': [section: DataSourceSection];
}>();

function select(section: DataSourceSection): void {
  if (section === props.section) return;
  emit('update:section', section);
}
</script>

<template>
  <header class="flex h-12 flex-shrink-0 items-center gap-8 border-b border-[#E2E2E2] bg-white px-5">
    <div class="flex min-w-0 items-center gap-2.5">
      <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#F1ECFA] text-[#3B1770]">
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
          <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      </span>
      <p class="truncate text-sm font-semibold text-[#25262E]">{{ sourceName ?? 'Untitled data source' }}</p>
    </div>

    <nav class="-mb-px flex h-full min-w-0 flex-1 items-stretch gap-1" aria-label="Data source sections">
      <button
        v-for="item in SECTIONS"
        :key="item.id"
        type="button"
        class="border-b-2 px-3 text-sm font-medium transition-colors"
        :class="
          section === item.id
            ? 'border-[#3B1770] text-[#3B1770]'
            : 'border-transparent text-[#6B6B6B] hover:text-[#25262E]'
        "
        :aria-current="section === item.id ? 'page' : undefined"
        @click="select(item.id)"
      >
        {{ item.label }}
      </button>
    </nav>
  </header>
</template>
