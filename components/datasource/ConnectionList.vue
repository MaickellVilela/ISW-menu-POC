<script setup lang="ts">
import { computed } from 'vue';
import {
  connectionHasUsedTable,
  matchingEntityCaption,
  searchConnections,
  type DataSourceConnection,
} from '~/composables/dataSourceCatalog';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import HighlightedText from './HighlightedText.vue';

const props = withDefaults(
  defineProps<{
    connections: DataSourceConnection[];
    searchQuery: string;
    usedTableIdentities?: string[];
  }>(),
  { usedTableIdentities: () => [] },
);

const emit = defineEmits<{
  select: [connection: DataSourceConnection];
  'update:searchQuery': [query: string];
}>();

const visibleMatches = computed(() =>
  searchConnections(props.connections, props.searchQuery).map((match) => ({
    ...match,
    caption: matchingEntityCaption(match.matchingEntities),
    inUse: connectionHasUsedTable(match.connection, props.usedTableIdentities),
  })),
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex-shrink-0 px-3 pb-2 pt-3">
      <label class="relative block">
        <span class="sr-only">Search connections or tables</span>
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
          placeholder="Search connections or tables"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white pl-8 pr-2.5 text-xs text-[#25262E] placeholder:text-[#9A9A9A] outline-none focus:border-[#3B1770]"
        />
      </label>
    </div>

    <ul v-if="visibleMatches.length > 0" class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      <li v-for="match in visibleMatches" :key="match.connection.id">
        <button
          type="button"
          class="group flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors"
          :class="
            match.inUse
              ? 'border-[#D4C8EA] bg-[#F8F6FC] hover:bg-[#F5F1FC]'
              : 'border-transparent hover:bg-[#F5F1FC]'
          "
          :title="match.connection.name"
          :aria-label="
            match.inUse
              ? `${match.connection.name}, has tables in use on the canvas`
              : match.connection.name
          "
          @click="emit('select', match.connection)"
        >
          <img
            :src="CONNECTOR_ICONS[match.connection.connector]"
            alt=""
            class="h-5 w-5 flex-shrink-0 object-contain"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-[#25262E]">
              <HighlightedText :text="match.connection.name" :query="searchQuery" />
            </span>
            <span
              v-if="match.caption"
              class="mt-0.5 block truncate text-[11px] text-[#7A7A7A]"
            >
              <HighlightedText :text="match.caption" :query="searchQuery" />
            </span>
          </span>
          <span class="text-[10px] tabular-nums text-[#9A9A9A]">{{ match.connection.entityKeys.length }}</span>
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
        <p class="text-sm font-medium text-[#25262E]">No connections found</p>
        <p class="mt-1 text-xs text-[#7A7A7A]">Try a different search.</p>
      </div>
    </div>
  </div>
</template>
