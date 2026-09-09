<script setup lang="ts">
import {
  filterValueSummary,
  type GlobalFilter,
} from '~/composables/useDataSourceGlobalSettings';

const props = defineProps<{
  filter: GlobalFilter;
  nested: boolean;
}>();

const emit = defineEmits<{
  edit: [];
  remove: [];
  move: [];
}>();

function startDrag(event: DragEvent): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', props.filter.id);
  event.dataTransfer.setData('application/x-global-filter', props.filter.id);
}
</script>

<template>
  <article
    draggable="true"
    role="listitem"
    :aria-label="`${filter.fieldLabel}: ${filter.operator}, ${filterValueSummary(filter)}`"
    class="group flex min-w-0 items-center gap-2 rounded-lg border border-[#C9CED6] bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md"
    @dragstart="startDrag"
  >
    <span
      class="grid flex-shrink-0 cursor-grab grid-cols-2 gap-0.5 text-[#667892] active:cursor-grabbing"
      aria-hidden="true"
    >
      <i v-for="index in 6" :key="index" class="h-1 w-1 rounded-full bg-current"></i>
    </span>

    <button type="button" class="min-w-0 flex-1 text-left" @click="emit('edit')">
      <span class="block truncate text-sm font-medium text-[#25262E]">
        {{ filter.fieldLabel }}: {{ filter.operator }}
      </span>
      <span class="mt-0.5 block truncate text-xs text-[#667892]">
        {{ filterValueSummary(filter) }}
      </span>
    </button>

    <button
      type="button"
      class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[#667892] opacity-60 transition-all hover:bg-[#F1ECFA] hover:text-[#3B1770] hover:opacity-100 focus:opacity-100"
      :aria-label="nested ? `Move ${filter.fieldLabel} out of nested filters` : `Move ${filter.fieldLabel} into nested filters`"
      :title="nested ? 'Move out of nested filters' : 'Move into nested filters'"
      @click="emit('move')"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path
          v-if="nested"
          d="M9 5H5v14h14v-4M10 14 19 5M13 5h6v6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          v-else
          d="M15 5h4v14H5v-4M14 10 5 19M5 13v6h6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <button
      type="button"
      class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#667892] transition-colors hover:bg-[#FCEEEF] hover:text-[#B4232D]"
      :aria-label="`Remove ${filter.fieldLabel} filter`"
      @click="emit('remove')"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12h7" stroke-linecap="round" />
      </svg>
    </button>
  </article>
</template>
