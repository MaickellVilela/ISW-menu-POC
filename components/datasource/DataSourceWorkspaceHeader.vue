<script setup lang="ts">
export type DataSourceSection = 'canvas' | 'settings';

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
  <header class="flex h-14 flex-shrink-0 items-center justify-between gap-6 border-b border-[#E2E2E2] bg-white px-5">
    <div class="flex min-w-0 items-center gap-2.5">
      <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#F1ECFA] text-[#3B1770]">
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
          <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      </span>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-[#25262E]">{{ sourceName ?? 'Untitled data source' }}</p>
        <p class="text-[10px] text-[#9A9A9A]">
          {{ section === 'canvas' ? 'Source canvas' : 'Configuration' }}
        </p>
      </div>
    </div>

    <button
      v-if="section === 'canvas'"
      type="button"
      class="inline-flex flex-shrink-0 items-center gap-2 rounded-md border border-[#D8D8D8] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:bg-[#F8F6FC] hover:text-[#3B1770]"
      @click="select('settings')"
    >
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
        <circle cx="9" cy="7" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="9" cy="17" r="1.6" fill="currentColor" stroke="none" />
      </svg>
      Configure
    </button>

    <button
      v-else
      type="button"
      class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#3B1770] transition-colors hover:bg-[#F1ECFA]"
      @click="select('canvas')"
    >
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m14.5 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Back to canvas
    </button>
  </header>
</template>
