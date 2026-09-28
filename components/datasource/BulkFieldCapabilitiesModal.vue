<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FieldCapabilities, OutputFieldRow } from '~/composables/useDataSourceCanvas';

const props = defineProps<{
  open: boolean;
  rows: OutputFieldRow[];
}>();

const emit = defineEmits<{
  cancel: [];
  save: [patch: Record<string, FieldCapabilities>];
}>();

const CAPABILITY_COLUMNS: { key: keyof FieldCapabilities; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'filtering', label: 'Filtering' },
  { key: 'grouping', label: 'Grouping' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'playing', label: 'Playing' },
  { key: 'rawData', label: 'Raw Data' },
];

const query = ref('');
const draft = ref<Record<string, FieldCapabilities>>({});

function reset(): void {
  query.value = '';
  draft.value = Object.fromEntries(props.rows.map((row) => [row.key, { ...row.capabilities }]));
}

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
);

const visibleRows = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return props.rows;
  return props.rows.filter((row) => row.name.toLowerCase().includes(needle));
});

function toggle(key: string, capability: keyof FieldCapabilities, checked: boolean): void {
  draft.value = { ...draft.value, [key]: { ...draft.value[key], [capability]: checked } };
}

function save(): void {
  emit('save', draft.value);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <section
        class="flex max-h-[85vh] w-[min(52rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-capabilities-title"
      >
        <header class="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <h2 id="bulk-capabilities-title" class="text-lg font-semibold text-[#25262E]">Bulk Update Field Capabilities</h2>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] outline-none hover:bg-[#F3F3F4] hover:text-[#25262E] focus-visible:ring-2 focus-visible:ring-[#6F42A5]"
            aria-label="Close"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="flex-shrink-0 px-5 pb-2">
          <label class="relative block">
            <span class="sr-only">Search fields</span>
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              v-model="query"
              type="search"
              placeholder="Search"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white pl-8 pr-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>
        </div>

        <div class="min-h-0 flex-1 overflow-auto px-5">
          <table class="min-w-full text-left">
            <thead>
              <tr>
                <th class="sticky top-0 border-b border-[#EAEAEA] bg-white px-2 py-2 text-[11px] font-semibold text-[#52525B]">Label</th>
                <th class="sticky top-0 border-b border-[#EAEAEA] bg-white px-2 py-2 text-[11px] font-semibold text-[#52525B]">Type</th>
                <th
                  v-for="column in CAPABILITY_COLUMNS"
                  :key="column.key"
                  class="sticky top-0 whitespace-nowrap border-b border-[#EAEAEA] bg-white px-2 py-2 text-center text-[11px] font-semibold text-[#52525B]"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="row.key" class="border-b border-[#F0F0F0] last:border-b-0">
                <td class="px-2 py-2 text-sm text-[#25262E]">{{ row.name }}</td>
                <td class="px-2 py-2 text-xs text-[#7A7A7A]">{{ row.origin === 'derived' ? 'Derived' : 'Native' }}</td>
                <td v-for="column in CAPABILITY_COLUMNS" :key="column.key" class="px-2 py-2 text-center">
                  <button
                    type="button"
                    role="switch"
                    class="relative inline-block h-5 w-9 rounded-full transition-colors"
                    :class="draft[row.key]?.[column.key] ? 'bg-[#3B1770]' : 'bg-[#C9CED6]'"
                    :aria-checked="Boolean(draft[row.key]?.[column.key])"
                    :aria-label="`${column.label} for ${row.name}`"
                    @click="toggle(row.key, column.key, !draft[row.key]?.[column.key])"
                  >
                    <span
                      class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left,right]"
                      :class="draft[row.key]?.[column.key] ? 'right-0.5' : 'left-0.5'"
                    />
                  </button>
                </td>
              </tr>
              <tr v-if="visibleRows.length === 0">
                <td :colspan="2 + CAPABILITY_COLUMNS.length" class="px-2 py-6 text-center text-[11px] text-[#7A7A7A]">
                  No fields match this search.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="mt-1 flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-5 py-3">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('cancel')"
          >
            Close
          </button>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B1E8C]"
            @click="save"
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
