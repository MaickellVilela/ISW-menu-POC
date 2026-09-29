<script setup lang="ts">
import { computed } from 'vue';
import {
  schemaHasUsedTable,
  schemaNameMatches,
  schemasForConnection,
  type DataSourceConnection,
} from '~/composables/dataSourceCatalog';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import type { ConnectionSchema } from '~/composables/dataSourceEntities';
import HighlightedText from './HighlightedText.vue';

const props = withDefaults(
  defineProps<{
    connection: DataSourceConnection;
    searchQuery?: string;
    usedTableIdentities?: string[];
    catalogRevision?: number;
  }>(),
  { searchQuery: '', usedTableIdentities: () => [], catalogRevision: 0 },
);

const emit = defineEmits<{
  back: [];
  select: [schema: ConnectionSchema];
  'update:searchQuery': [query: string];
}>();

const schemas = computed(() => {
  void props.catalogRevision;
  return schemasForConnection(props.connection);
});

/** Matches by schema name only — search is scoped one hierarchy level at a time. */
const visibleSchemas = computed(() => {
  const query = props.searchQuery.trim();
  if (!query) return schemas.value;
  return schemas.value.filter((schema) => schemaNameMatches(schema, query));
});

function inUse(schema: ConnectionSchema): boolean {
  return schemaHasUsedTable(props.connection, schema, props.usedTableIdentities);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="flex-shrink-0 border-b border-[#EAEAEA] px-3 py-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-medium text-[#667085] transition-colors hover:bg-[#F5F1FC] hover:text-[#3B1770]"
        @click="emit('back')"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m14.5 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Connections
      </button>

      <div class="mt-2 flex min-w-0 items-center gap-2.5">
        <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[#E2E2E2] bg-white">
          <img :src="CONNECTOR_ICONS[connection.connector]" alt="" class="h-5 w-5 object-contain" />
        </span>
        <span class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-[#25262E]" :title="connection.name">
            {{ connection.name }}
          </h2>
          <p class="text-[11px] text-[#7A7A7A]">
            {{ schemas.length }} schema{{ schemas.length === 1 ? '' : 's' }}
          </p>
        </span>
      </div>
    </header>

    <div class="flex-shrink-0 px-3 py-2.5">
      <label class="relative block">
        <span class="sr-only">Search schemas</span>
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" stroke-linecap="round" />
        </svg>
        <input
          :value="searchQuery"
          type="search"
          placeholder="Search schemas"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white pl-8 pr-2.5 text-xs text-[#25262E] placeholder:text-[#9A9A9A] outline-none focus:border-[#3B1770]"
        />
      </label>
      <p class="mt-2 text-[11px] text-[#7A7A7A]">Select a schema to see its tables.</p>
    </div>

    <ul v-if="visibleSchemas.length > 0" class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      <li v-for="schema in visibleSchemas" :key="schema.name">
        <button
          type="button"
          class="group flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors"
          :class="
            inUse(schema)
              ? 'border-[#D4C8EA] bg-[#F8F6FC] hover:bg-[#F5F1FC]'
              : 'border-transparent hover:bg-[#F5F1FC]'
          "
          :title="schema.name"
          :aria-label="
            inUse(schema)
              ? `${schema.name}, has tables in use on the canvas`
              : schema.name
          "
          @click="emit('select', schema)"
        >
          <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#F1ECFA] text-[#3B1770]">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <ellipse cx="12" cy="6.5" rx="7" ry="2.5" />
              <path d="M5 6.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" />
              <path d="M5 11.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-[#25262E]">
              <HighlightedText :text="schema.name" :query="searchQuery" />
            </span>
          </span>
          <span class="text-[10px] tabular-nums text-[#9A9A9A]">{{ schema.entityKeys.length }}</span>
          <svg
            viewBox="0 0 24 24"
            class="h-3 w-3 flex-shrink-0 text-[#52525B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#3B1770]"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
          >
            <path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </li>
    </ul>

    <div v-else class="flex min-h-0 flex-1 items-center justify-center px-5 text-center">
      <div>
        <p class="text-sm font-medium text-[#25262E]">No schemas found</p>
        <p class="mt-1 text-xs text-[#7A7A7A]">Try a different search.</p>
      </div>
    </div>
  </div>
</template>
