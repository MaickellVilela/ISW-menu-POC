<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import {
  filterFieldDisplayName,
  normalizeFilterFieldType,
  type FilterFieldType,
} from '~/composables/useDataSourceGlobalSettings';

type FieldTypeTab = 'all' | FilterFieldType;

interface FieldGroup {
  id: FilterFieldType;
  label: string;
  fields: FieldOption[];
}

const props = defineProps<{
  fields: FieldOption[];
  sourceName: string;
  originLabel?: string;
}>();

const emit = defineEmits<{
  select: [field: FieldOption];
  cancel: [];
}>();

const searchQuery = ref('');
const activeType = ref<FieldTypeTab>('all');

const TYPE_TABS: Array<{ id: FieldTypeTab; label: string; shortLabel: string }> = [
  { id: 'all', label: 'All fields', shortLabel: 'All' },
  { id: 'attribute', label: 'Attribute fields', shortLabel: 'ABC' },
  { id: 'number', label: 'Number fields', shortLabel: '1.23' },
  { id: 'time', label: 'Time fields', shortLabel: '' },
];

const visibleFields = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return props.fields.filter((field) => {
    const type = normalizeFilterFieldType(field.type);
    const matchesType = activeType.value === 'all' || type === activeType.value;
    const matchesSearch = !query
      || `${field.name} ${field.entity} ${field.type}`.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });
});

const groups = computed<FieldGroup[]>(() => {
  const definitions: Array<{ id: FilterFieldType; label: string }> = [
    { id: 'attribute', label: 'Attribute' },
    { id: 'number', label: 'Number' },
    { id: 'time', label: 'Time' },
  ];

  return definitions
    .map((definition) => ({
      ...definition,
      fields: visibleFields.value.filter(
        (field) => normalizeFilterFieldType(field.type) === definition.id,
      ),
    }))
    .filter((group) => group.fields.length > 0);
});
</script>

<template>
  <div class="flex max-h-[min(42rem,calc(100vh-4rem))] flex-col">
    <header class="flex flex-shrink-0 items-center justify-between gap-4 px-6 pb-4 pt-5">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-[#6F42A5]">
          {{ originLabel ?? 'Global filters' }}
        </p>
        <h2 class="mt-1 text-xl font-semibold text-[#25262E]">Select a field</h2>
      </div>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
        aria-label="Close field selection"
        @click="emit('cancel')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <div class="flex-shrink-0 px-6 pb-4">
      <p class="mb-2 text-sm text-[#64748B]">{{ sourceName }}</p>
      <div class="flex gap-2">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">Search fields</span>
          <svg
            viewBox="0 0 24 24"
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search"
            autofocus
            class="h-10 w-full rounded-md border border-[#6F42A5] bg-white pl-9 pr-3 text-sm text-[#25262E] placeholder:text-[#64748B] outline-none focus:ring-1 focus:ring-[#6F42A5]"
          />
        </label>

        <div class="inline-flex h-10 flex-shrink-0 overflow-hidden rounded-md border border-[#C9CED6]" role="tablist" aria-label="Field type">
          <button
            v-for="tab in TYPE_TABS"
            :key="tab.id"
            type="button"
            role="tab"
            class="flex min-w-14 items-center justify-center border-r border-[#C9CED6] px-3 text-sm font-medium transition-colors last:border-r-0"
            :class="activeType === tab.id ? 'bg-[#6F42A5] text-white' : 'bg-white text-[#25262E] hover:bg-[#F7F4FB]'"
            :aria-label="tab.label"
            :aria-selected="activeType === tab.id"
            @click="activeType = tab.id"
          >
            <svg
              v-if="tab.id === 'time'"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
              <path d="M8 3v5M16 3v5M4 10h16" stroke-linecap="round" />
            </svg>
            <span v-else>{{ tab.shortLabel }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      <div v-if="groups.length > 0" class="space-y-3">
        <section v-for="group in groups" :key="group.id">
          <h3 class="mb-1.5 text-sm font-medium text-[#25262E]">{{ group.label }}</h3>
          <div class="overflow-hidden rounded-md border border-[#C9CED6] bg-white">
            <button
              v-for="field in group.fields"
              :key="field.value"
              type="button"
              class="flex w-full items-center gap-3 border-b border-[#D8DCE2] px-3 py-2.5 text-left text-sm text-[#25262E] transition-colors last:border-b-0 hover:bg-[#F7F4FB]"
              @click="emit('select', field)"
            >
              <span class="h-4 w-4 flex-shrink-0 rounded-full border border-[#C9CED6] bg-white"></span>
              <span class="min-w-0 flex-1 truncate">{{ filterFieldDisplayName(field.name) }}</span>
              <span class="truncate text-xs text-[#8A93A1]">{{ field.entity }}</span>
            </button>
          </div>
        </section>
      </div>

      <div v-else class="rounded-md border border-dashed border-[#C9CED6] px-5 py-12 text-center">
        <p class="text-sm font-medium text-[#25262E]">
          {{ fields.length === 0 ? 'No fields available' : 'No matching fields' }}
        </p>
        <p class="mt-1 text-xs text-[#6B7280]">
          {{
            fields.length === 0
              ? 'Connect an entity to Output on the canvas, then try again.'
              : 'Try another search or field type.'
          }}
        </p>
      </div>
    </div>
  </div>
</template>
