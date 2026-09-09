<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  filterSourceItems,
  type DataSourceConnection,
} from '~/composables/dataSourceCatalog';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import type { SourceItem } from '~/composables/useDataSourceCanvas';
import DraggableSourceItem from './DraggableSourceItem.vue';

const props = defineProps<{
  connection: DataSourceConnection;
  entities: SourceItem[];
}>();

const emit = defineEmits<{
  back: [];
}>();

const searchQuery = ref('');
const visibleEntities = computed(() =>
  filterSourceItems(props.entities, searchQuery.value),
);
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
            {{ entities.length }} entit{{ entities.length === 1 ? 'y' : 'ies' }}
          </p>
        </span>
      </div>
    </header>

    <div class="flex-shrink-0 px-3 py-2.5">
      <label class="relative block">
        <span class="sr-only">Search entities</span>
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
          v-model="searchQuery"
          type="search"
          placeholder="Search entities"
          class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white pl-8 pr-2.5 text-xs text-[#25262E] placeholder:text-[#9A9A9A] outline-none focus:border-[#3B1770]"
        />
      </label>
      <p class="mt-2 text-[11px] text-[#7A7A7A]">Drag an entity onto the canvas.</p>
    </div>

    <ul v-if="visibleEntities.length > 0" class="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
      <DraggableSourceItem
        v-for="entity in visibleEntities"
        :key="entity.key"
        :item="entity"
      />
    </ul>

    <div v-else class="flex min-h-0 flex-1 items-center justify-center px-5 text-center">
      <div>
        <p class="text-sm font-medium text-[#25262E]">No entities found</p>
        <p class="mt-1 text-xs text-[#7A7A7A]">Try another search.</p>
      </div>
    </div>
  </div>
</template>
