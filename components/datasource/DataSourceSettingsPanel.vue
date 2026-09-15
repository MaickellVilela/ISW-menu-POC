<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import { readCanvasFieldOptions } from '~/composables/useDataSourceCache';
import {
  useDataSourceGlobalSettings,
  type MapLocaleSettings,
  type TimeBarSettings,
} from '~/composables/useDataSourceGlobalSettings';
import CacheConfigPanel from './CacheConfigPanel.vue';
import FilterValuesSettingsPanel from './FilterValuesSettingsPanel.vue';
import GlobalFiltersSettingsPanel from './GlobalFiltersSettingsPanel.vue';
import MapLocaleSettingsPanel from './MapLocaleSettingsPanel.vue';
import TimeBarSettingsPanel from './TimeBarSettingsPanel.vue';

type SettingsSection =
  | 'time-bar'
  | 'cache'
  | 'filter-values'
  | 'map-locale'
  | 'global-filters';

interface SettingsNavigationItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: 'clock' | 'cache' | 'values' | 'map' | 'filter';
}

const NAVIGATION: SettingsNavigationItem[] = [
  {
    id: 'time-bar',
    label: 'Time bar',
    description: 'Ranges and live queries',
    icon: 'clock',
  },
  {
    id: 'cache',
    label: 'Cache',
    description: 'Results and field statistics',
    icon: 'cache',
  },
  {
    id: 'filter-values',
    label: 'Performance filters',
    description: 'Lookups for filter UIs, not this output',
    icon: 'values',
  },
  {
    id: 'map-locale',
    label: 'Map & locale',
    description: 'Tiles and country labels',
    icon: 'map',
  },
  {
    id: 'global-filters',
    label: 'Global filters',
    description: 'Filters applied to the source output',
    icon: 'filter',
  },
];

const emit = defineEmits<{
  'go-to-canvas': [];
}>();

const props = withDefaults(
  defineProps<{
    sourceName?: string;
  }>(),
  { sourceName: 'Untitled data source' },
);

const activeSection = ref<SettingsSection>('time-bar');
const availableFields = ref<FieldOption[]>([]);
const {
  settings,
  load,
  addFilter,
  updateFilter,
  removeFilter,
  setFilterNestingEnabled,
  setNestedFilterOperator,
  moveFilterToNested,
  moveFilterToRoot,
} = useDataSourceGlobalSettings();

onMounted(() => {
  load();
  availableFields.value = readCanvasFieldOptions();
});

function updateTimeBar(value: TimeBarSettings): void {
  settings.value = { ...settings.value, timeBar: value };
}

function updateMapLocale(value: MapLocaleSettings): void {
  settings.value = { ...settings.value, mapLocale: value };
}
</script>

<template>
  <div class="flex h-full min-h-0 bg-[#FAFAFA]">
    <aside class="flex w-56 flex-shrink-0 flex-col border-r border-[#E2E2E2] bg-white" aria-label="Configuration sections">
      <div class="border-b border-[#EAEAEA] px-4 py-5">
        <h1 class="text-base font-semibold text-[#25262E]">Data source configuration</h1>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-2.5">
        <button
          v-for="item in NAVIGATION"
          :key="item.id"
          type="button"
          class="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
          :class="
            activeSection === item.id
              ? 'bg-[#F1ECFA] text-[#3B1770]'
              : 'text-[#52525B] hover:bg-[#F7F7F8] hover:text-[#25262E]'
          "
          :aria-current="activeSection === item.id ? 'page' : undefined"
          @click="activeSection = item.id"
        >
          <span
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
            :class="activeSection === item.id ? 'bg-white/80' : 'bg-[#F7F7F8] group-hover:bg-white'"
          >
            <svg
              v-if="item.icon === 'clock'"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5v5l3.5 2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg
              v-else-if="item.icon === 'cache'"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <ellipse cx="12" cy="6" rx="7.5" ry="3" />
              <path d="M4.5 6v6c0 1.7 3.4 3 7.5 3 1.4 0 2.8-.2 3.9-.5M4.5 12v6c0 1.7 3.4 3 7.5 3 1.1 0 2.2-.1 3.1-.3" />
              <path d="M20.5 15.5a4 4 0 1 0 .1 4M20.5 15.5v3h-3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg
              v-else-if="item.icon === 'values'"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M4 5h16M4 12h9M4 19h7" stroke-linecap="round" />
              <circle cx="17.5" cy="15" r="2.5" />
              <path d="M17.5 11.5v1M17.5 17.5v1M14 15h1M20 15h1" stroke-linecap="round" />
            </svg>
            <svg
              v-else-if="item.icon === 'map'"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="m3.5 6 5-2.5 7 2.5 5-2.5v14l-5 2.5-7-2.5-5 2.5V6Z" stroke-linejoin="round" />
              <path d="M8.5 3.5v14M15.5 6v14" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-medium">{{ item.label }}</span>
            <span
              class="mt-0.5 block truncate text-[10px]"
              :class="activeSection === item.id ? 'text-[#72549B]' : 'text-[#9A9A9A]'"
            >
              {{ item.description }}
            </span>
          </span>
        </button>
      </nav>

      <div class="border-t border-[#EAEAEA] px-4 py-3">
        <p class="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-[#33805D]" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Changes save automatically
        </p>
      </div>
    </aside>

    <main class="min-w-0 flex-1 overflow-hidden">
      <TimeBarSettingsPanel
        v-if="activeSection === 'time-bar'"
        :model-value="settings.timeBar"
        class="h-full overflow-y-auto"
        @update:model-value="updateTimeBar"
      />

      <CacheConfigPanel
        v-else-if="activeSection === 'cache'"
        class="h-full"
        @go-to-canvas="emit('go-to-canvas')"
      />

      <FilterValuesSettingsPanel
        v-else-if="activeSection === 'filter-values'"
        :target-fields="availableFields"
        :source-name="props.sourceName"
        class="h-full overflow-y-auto"
      />

      <MapLocaleSettingsPanel
        v-else-if="activeSection === 'map-locale'"
        :model-value="settings.mapLocale"
        class="h-full overflow-y-auto"
        @update:model-value="updateMapLocale"
      />

      <GlobalFiltersSettingsPanel
        v-else
        :model-value="settings.filters"
        :filter-nesting="settings.filterNesting"
        :available-fields="availableFields"
        :source-name="props.sourceName"
        class="h-full overflow-y-auto"
        @add="addFilter"
        @update="updateFilter"
        @remove="removeFilter"
        @update-nesting-enabled="setFilterNestingEnabled"
        @update-nesting-operator="setNestedFilterOperator"
        @move-to-nested="moveFilterToNested"
        @move-to-root="moveFilterToRoot"
      />
    </main>
  </div>
</template>
