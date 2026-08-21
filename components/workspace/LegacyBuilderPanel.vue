<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CONNECTOR_ICONS, connectorIcon, type ConnectorKey } from '~/composables/connectorIcons';
import { editorExitLabel, type SourceViewMode } from '~/composables/useWorkspaceAssets';

interface PreviewSource {
  id: string;
  name: string;
  connector?: ConnectorKey | null;
  subtitle?: string;
}

interface PreviewEntityNode {
  id: string;
  label: string;
  connector: ConnectorKey;
  top: number;
}

interface PreviewCanvasModel {
  entities: PreviewEntityNode[];
  outputTop: number;
  paths: string[];
}

const PREVIEW_TABLES_BY_NAME: Record<string, string[]> = {
  'Order Item Transaction Detail': ['order_items', 'orders'],
  'Campaign Cost Summary': ['campaigns', 'campaign_cost', 'cost_center'],
  'Claim Nulls': ['claim_nulls'],
  'Store Network Geo': ['stores', 'geo_regions'],
  'Campaign Cost': ['campaigns', 'ad_costs', 'channels'],
  'Customer Churn Scores': ['churn_scores'],
};

const ENTITY_RIGHT_X = 24;
const BUS_X = 54.4;
const OUTPUT_X = 83;

/** Reads "N table(s)" from a source subtitle; unknown counts preview as one entity. */
function tableCountFromSubtitle(subtitle: string | undefined): number {
  if (!subtitle) return 1;
  const match = subtitle.match(/(\d+)\s+tables?/i);
  if (!match) return 1;
  const count = Number(match[1]);
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.min(count, 4);
}

function slugifyEntityLabel(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'entity';
}

/** Table names shown on the mock canvas for a source. */
function entityLabelsForSource(name: string, count: number): string[] {
  const known = PREVIEW_TABLES_BY_NAME[name];
  if (known?.length) return known;

  const base = slugifyEntityLabel(name);
  if (count <= 1) return [base];

  const suffixes = ['', '_dim', '_fact', '_map'];
  return Array.from({ length: count }, (_, index) =>
    index === 0 ? base : `${base}${suffixes[index] ?? `_${index + 1}`}`,
  );
}

function previewConnectorForSource(connector: ConnectorKey | null | undefined): ConnectorKey {
  return connector ?? 'postgresql';
}

function previewEntityTops(count: number): number[] {
  if (count <= 1) return [29.4];
  if (count === 2) return [24, 58];
  if (count === 3) return [20, 42, 64];
  return [16, 34, 52, 70];
}

function previewOutputTop(tops: number[]): number {
  if (tops.length <= 1) return 71.7;
  return (tops[0] + tops[tops.length - 1]) / 2;
}

function previewPathsForTops(tops: number[], outputTop: number): string[] {
  if (!tops.length) return [];
  if (tops.length === 1) {
    const top = tops[0];
    return [`${ENTITY_RIGHT_X},${top} ${BUS_X},${top} ${BUS_X},${outputTop} ${OUTPUT_X},${outputTop}`];
  }

  const horizontals = tops.map((top) => `${ENTITY_RIGHT_X},${top} ${BUS_X},${top}`);
  const bus = `${BUS_X},${Math.min(...tops)} ${BUS_X},${Math.max(...tops)}`;
  const toOutput = `${BUS_X},${outputTop} ${OUTPUT_X},${outputTop}`;
  return [...horizontals, bus, toOutput];
}

/** POC canvas graph so switching sources visibly changes the preview. */
function buildPreviewCanvas(source: PreviewSource | null): PreviewCanvasModel {
  const name = source?.name.trim() || 'entity';
  const connector = previewConnectorForSource(source?.connector);
  const labels = entityLabelsForSource(name, tableCountFromSubtitle(source?.subtitle));
  const tops = previewEntityTops(labels.length);
  const entities = labels.map((label, index) => ({
    id: `${source?.id ?? 'preview'}-${index}`,
    label,
    connector,
    top: tops[index] ?? 29.4,
  }));
  const outputTop = previewOutputTop(entities.map((entity) => entity.top));
  return {
    entities,
    outputTop,
    paths: previewPathsForTops(
      entities.map((entity) => entity.top),
      outputTop,
    ),
  };
}

const props = withDefaults(
  defineProps<{
    mode?: SourceViewMode;
    updating?: boolean;
    sources?: PreviewSource[];
    selectedSourceId?: string | null;
  }>(),
  { mode: 'preview', updating: false, sources: () => [], selectedSourceId: null },
);

const emit = defineEmits<{
  close: [];
  edit: [];
  save: [];
  end: [];
  select: [id: string];
}>();

const isPreview = computed(() => props.mode === 'preview');

const selectedSource = computed(
  () => props.sources.find((source) => source.id === props.selectedSourceId) ?? null,
);

const previewCanvas = computed(() => buildPreviewCanvas(selectedSource.value));

/**
 * Visual simulation of the legacy (Classic Builder) data source screen.
 */

interface ConnectionRow {
  id: string;
  name: string;
  connector: ConnectorKey;
}

const CONNECTIONS: ConnectionRow[] = [
  { id: 'managed', name: 'Managed', connector: 'postgresql' },
  { id: 'redshift', name: 'Redshift', connector: 'redshift' },
  { id: 'snowflake-logi', name: 'Snowflake - Logi', connector: 'snowflake' },
  { id: 'snowflake-peter', name: 'Snowflake - Peter Test', connector: 'snowflake' },
  { id: 'fivision', name: 'fiVISION', connector: 's3' },
  { id: 'postgresql', name: 'PostgreSQL', connector: 'postgresql' },
  { id: 'parsable', name: 'Parsable', connector: 'mongodb' },
  { id: 'managed-peter', name: 'Managed - Peter', connector: 'postgresql' },
  { id: 'impala', name: 'Impala', connector: 'impala' },
  { id: 'bigquery', name: 'BigQuery', connector: 'bigquery' },
  { id: 'elasticsearch', name: 'Elasticsearch 7.0', connector: 'elasticsearch' },
  { id: 'postgresql-ses', name: "PostgreSQL | SE's", connector: 'postgresql' },
  { id: 'kipu', name: 'Kipu', connector: 'elasticsearch' },
  { id: 'redshift-snapshot', name: 'Redshift (2025-11-25T12:54…', connector: 'redshift' },
  { id: 'isw-snowflake', name: 'ISW Snowflake - SFDC', connector: 'snowflake' },
  { id: 'python-nested', name: 'Python Nested JSON', connector: 'python' },
  { id: 'flight-schedule', name: 'Flight Schedule Pro', connector: 'bigquery' },
  { id: 'learning-management', name: 'Learning Management Data', connector: 'hive' },
  { id: 'python', name: 'Python', connector: 'python' },
  { id: 'petertest', name: 'PeterTest', connector: 'python' },
  { id: 'adventureworks', name: 'AdventureWorks', connector: 'postgresql' },
  { id: 'adventureworkspgr', name: 'AdventureWorksPGR', connector: 'postgresql' },
  { id: 'water-data', name: 'Water Data', connector: 'mongodb' },
  { id: 'african-pioneer', name: 'African Pioneer Business Ce…', connector: 'postgresql' },
  { id: 'construction', name: 'Construction Data', connector: 's3' },
  { id: 'sales-data-table', name: 'Sales Data Table', connector: 'python' },
  { id: 'supabase', name: 'Supabase Demo', connector: 'postgresql' },
  { id: 'snowflake-personal', name: 'Snowflake - Peter Test Pers…', connector: 'snowflake' },
  { id: 'heuristic', name: 'Heuristic', connector: 'hive' },
];

const TOOLBAR_ITEMS = [
  {
    id: 'source-creation',
    label: 'Source Creation',
    path: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z',
  },
  {
    id: 'cache',
    label: 'Cache',
    path: 'M5.46257 4.43262C7.21556 2.91688 9.5007 2 12 2C17.5228 2 22 6.47715 22 12C22 14.1361 21.3302 16.1158 20.1892 17.7406L17 12H20C20 7.58172 16.4183 4 12 4C9.84982 4 7.89777 4.84827 6.46023 6.22842L5.46257 4.43262ZM18.5374 19.5674C16.7844 21.0831 14.4993 22 12 22C6.47715 22 2 17.5228 2 12C2 9.86386 2.66979 7.88416 3.8108 6.25944L7 12H4C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1517 17.5398 17.7716L18.5374 19.5674Z',
  },
  {
    id: 'global-settings',
    label: 'Global Settings',
    path: 'M21 18V21H19V18H17V15H23V18H21ZM5 18V21H3V18H1V15H7V18H5ZM11 6V3H13V6H15V9H9V6H11ZM11 11H13V21H11V11ZM3 13V3H5V13H3ZM19 13V3H21V13H19Z',
  },
];

const canvasMode = ref<'entity' | 'filter-value'>('entity');
const activeTab = ref<'connections' | 'files'>('connections');
const expandedIds = ref<string[]>([]);
const hasUnsavedChanges = ref(false);

watch(
  () => props.mode,
  (mode) => {
    if (mode === 'edit') hasUnsavedChanges.value = false;
  },
);

const exitLabel = computed(() => editorExitLabel(hasUnsavedChanges.value));

function isExpanded(id: string): boolean {
  return expandedIds.value.includes(id);
}

function toggleExpanded(id: string): void {
  expandedIds.value = isExpanded(id)
    ? expandedIds.value.filter((entry) => entry !== id)
    : [...expandedIds.value, id];
}

function markDirty(): void {
  if (isPreview.value) return;
  hasUnsavedChanges.value = true;
}

function onCanvasMode(mode: 'entity' | 'filter-value'): void {
  if (canvasMode.value === mode) return;
  canvasMode.value = mode;
  markDirty();
}

function onToolClick(): void {
  markDirty();
}

function onAddSqlEntity(): void {
  markDirty();
}

function onEdit(): void {
  emit('edit');
}

function onSave(): void {
  emit('save');
}

function onEndEditing(): void {
  emit('end');
}

function onSelectSource(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const id = target.value;
  if (!id || id === props.selectedSourceId) return;
  emit('select', id);
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col bg-[#F4F4F4]">
    <div
      v-if="updating"
      class="preview-update-overlay absolute inset-0 z-30 flex items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="relative z-10 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#3B1770] shadow-sm">
        Updating preview…
      </span>
    </div>
    <p
      v-if="!isPreview"
      class="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#E2E2E2] bg-[#F8F6FC] px-3 py-1.5 text-[11px] text-[#3B1770]"
    >
      <span>{{
        hasUnsavedChanges
          ? "You're editing this source. Save to keep changes, or discard to return to the agent."
          : "You're editing this source. Save to return to the agent."
      }}</span>
      <button
        type="button"
        class="flex-shrink-0 rounded border border-[#E2E2E2] bg-white px-2 py-0.5 text-[11px] font-medium text-[#25262E] transition-colors hover:bg-[#F8F6FC]"
        @click="onEndEditing"
      >
        {{ exitLabel }}
      </button>
    </p>

    <!-- Toolbar -->
    <div class="flex h-12 flex-shrink-0 items-center justify-between gap-4 border-b border-[#E2E2E2] bg-white px-4">
      <div class="flex min-w-0 items-center gap-6">
        <template v-if="isPreview">
          <div class="flex min-w-0 items-center gap-2">
            <span class="flex-shrink-0 text-sm font-medium text-[#25262E]">Preview</span>
            <label class="sr-only" for="preview-source">Data source</label>
            <select
              id="preview-source"
              class="h-8 min-w-[10rem] max-w-[18rem] rounded-md border border-[#E2E2E2] bg-white px-2 text-[12px] text-[#25262E] outline-none focus:border-[#3B1770]"
              :value="selectedSourceId ?? ''"
              :disabled="sources.length < 2"
              @change="onSelectSource"
            >
              <option v-for="source in sources" :key="source.id" :value="source.id">
                {{ source.name }}
              </option>
            </select>
          </div>
        </template>
        <template v-else>
          <button
            v-for="tool in TOOLBAR_ITEMS"
            :key="tool.id"
            type="button"
            class="flex items-center gap-1.5 text-[11px] text-[#25262E] transition-colors hover:text-[#3B1770]"
            @click="onToolClick"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-[#6B6B6B]" fill="currentColor">
              <path :d="tool.path" />
            </svg>
            {{ tool.label }}
          </button>
        </template>
      </div>

      <div class="flex flex-shrink-0 items-center gap-3">
        <template v-if="isPreview">
          <button
            type="button"
            class="rounded bg-[#3B1770] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#4B1E8C]"
            @click="onEdit"
          >
            Edit source
          </button>
          <span class="h-5 w-px flex-shrink-0 bg-[#E2E2E2]"></span>
          <button
            type="button"
            class="text-[#6B6B6B] transition-colors hover:text-[#3B1770]"
            title="Close preview"
            aria-label="Close preview"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </template>
        <template v-else>
          <!-- Publish -->
          <button type="button" class="text-[#5A6270] transition-colors hover:text-[#3B1770]" title="Publish">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke-linecap="round" />
            </svg>
          </button>
          <!-- Preview -->
          <button type="button" class="text-[#5A6270] transition-colors hover:text-[#3B1770]" title="Preview">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <!-- Duplicate -->
          <button type="button" class="text-[#5A6270] transition-colors hover:text-[#3B1770]" title="Duplicate">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="4" y="4" width="11" height="11" rx="1.5" />
              <path d="M9 20h9a2 2 0 0 0 2-2V9" stroke-linecap="round" />
            </svg>
          </button>
          <!-- Rename -->
          <button type="button" class="text-[#5A6270] transition-colors hover:text-[#3B1770]" title="Rename">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M19 13v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" stroke-linecap="round" />
              <path d="M10 14l9-9 1.5 1.5-9 9H10v-1.5z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            class="rounded bg-[#3B1770] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#4B1E8C]"
            @click="onSave"
          >
            Save Source
          </button>
        </template>
      </div>
    </div>

    <div class="flex min-h-0 flex-1">
      <!-- Canvas -->
      <div class="min-w-0 flex-1 p-2">
        <div class="relative h-full w-full border border-dashed border-[#C9C9C9] bg-white">
          <!-- Add join -->
          <button
            v-if="!isPreview"
            type="button"
            class="absolute left-3 top-3 flex cursor-not-allowed items-center gap-1.5 rounded px-2 py-1 text-[11px] text-[#B4B4B4] opacity-60"
            disabled
            aria-disabled="true"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="9" cy="12" r="5" />
              <circle cx="15" cy="12" r="5" />
            </svg>
            Add Join
          </button>

          <!-- Entity / Filter value toggle -->
          <div class="absolute right-3 top-3 flex overflow-hidden rounded border border-[#D8D8D8] text-[11px]">
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :class="canvasMode === 'entity' ? 'bg-[#3B1770] text-white' : 'bg-white text-[#6B6B6B] hover:bg-[#F5F1FC]'"
              @click="onCanvasMode('entity')"
            >
              Entity
            </button>
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :class="canvasMode === 'filter-value' ? 'bg-[#3B1770] text-white' : 'bg-white text-[#6B6B6B] hover:bg-[#F5F1FC]'"
              @click="onCanvasMode('filter-value')"
            >
              Filter Value
            </button>
          </div>

          <!-- Connector: entities -> output -->
          <svg
            class="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              v-for="(path, index) in previewCanvas.paths"
              :key="index"
              :points="path"
              fill="none"
              stroke="#C4C4C4"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
          </svg>
          <svg
            class="pointer-events-none absolute h-2.5 w-2.5 -translate-y-1/2 text-[#C4C4C4]"
            :style="{ left: '82.5%', top: `${previewCanvas.outputTop}%` }"
            viewBox="0 0 10 10"
            aria-hidden="true"
          >
            <path d="M0 1.5 6 5 0 8.5Z" fill="currentColor" />
          </svg>

          <!-- Entity nodes -->
          <div
            v-for="entity in previewCanvas.entities"
            :key="entity.id"
            class="absolute flex h-7 items-center gap-2 rounded border border-[#D8D8D8] bg-white px-2 shadow-sm"
            :style="{ left: '5.2%', top: `${entity.top}%`, width: '18.8%', transform: 'translateY(-50%)' }"
          >
            <img
              :src="connectorIcon(entity.connector) ?? CONNECTOR_ICONS.postgresql"
              alt=""
              class="h-3.5 w-3.5 flex-shrink-0 object-contain"
            />
            <span class="min-w-0 flex-1 truncate text-[11px] text-[#25262E]">{{ entity.label }}</span>
            <button
              v-if="!isPreview"
              type="button"
              class="flex-shrink-0 text-[#6B6B6B] hover:text-[#3B1770]"
              title="Collapse"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- Output node -->
          <div
            class="absolute flex h-7 items-center gap-1.5 rounded border border-[#D8D8D8] bg-white px-2 shadow-sm"
            :style="{ left: '84.5%', top: `${previewCanvas.outputTop}%`, transform: 'translateY(-50%)' }"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 flex-shrink-0 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M9 12h6M12 9l3 3-3 3" stroke-linecap="round" />
            </svg>
            <span class="text-[11px] text-[#25262E]">Output</span>
          </div>

          <!-- Canvas controls -->
          <div class="absolute bottom-3 left-3 flex flex-col gap-3 text-[#6B6B6B]">
            <button type="button" class="hover:text-[#3B1770]" title="Zoom in">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" stroke-linecap="round" />
              </svg>
            </button>
            <button type="button" class="hover:text-[#3B1770]" title="Zoom out">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14" stroke-linecap="round" />
              </svg>
            </button>
            <button type="button" class="hover:text-[#3B1770]" title="Fit to screen">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke-linecap="round" />
              </svg>
            </button>
            <button type="button" class="hover:text-[#3B1770]" title="Lock canvas">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Right panel: connections and files, editing only -->
      <div v-if="!isPreview" class="flex w-[262px] flex-shrink-0 border-l border-[#E2E2E2] bg-white">
        <!-- Icon rail: vertical tabs, the active cell merges into the panel -->
        <div class="flex w-11 flex-shrink-0 flex-col border-[#E2E2E2] text-[#6B6B6B]">
          <button
            type="button"
            class="flex h-11 flex-shrink-0 items-center justify-center border-b border-[#E2E2E2] bg-white text-[#25262E]"
            title="Connections"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <ellipse cx="12" cy="5" rx="7" ry="2.5" />
              <path d="M5 5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5M5 11v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-11 flex-shrink-0 items-center justify-center border-b border-r border-[#E2E2E2] bg-[#F7F7F7] transition-colors hover:text-[#3B1770]"
            title="Settings"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
              <circle cx="9" cy="7" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="9" cy="17" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <div class="flex-1 border-r border-[#E2E2E2]"></div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col border-t border-[#E2E2E2]">
          <!-- Tabs -->
          <div class="flex flex-shrink-0 items-center gap-6 border-b border-[#E2E2E2] px-3 pt-2.5">
            <button
              type="button"
              class="-mb-px flex items-center gap-1.5 border-b-2 pb-1.5 text-[12px] transition-colors"
              :class="activeTab === 'connections' ? 'border-[#3B1770] font-semibold text-[#3B1770]' : 'border-transparent text-[#6B6B6B]'"
              @click="activeTab = 'connections'"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                <path
                  d="M13 18V20H19V22H13C11.8954 22 11 21.1046 11 20V18H8C5.79086 18 4 16.2091 4 14V7C4 6.44772 4.44772 6 5 6H8V2H10V6H14V2H16V6H19C19.5523 6 20 6.44772 20 7V14C20 16.2091 18.2091 18 16 18H13ZM8 16H16C17.1046 16 18 15.1046 18 14V11H6V14C6 15.1046 6.89543 16 8 16ZM18 8H6V9H18V8ZM12 14.5C11.4477 14.5 11 14.0523 11 13.5C11 12.9477 11.4477 12.5 12 12.5C12.5523 12.5 13 12.9477 13 13.5C13 14.0523 12.5523 14.5 12 14.5Z"
                />
              </svg>
              Connections
            </button>
            <button
              type="button"
              class="-mb-px flex items-center gap-1.5 border-b-2 pb-1.5 text-[12px] transition-colors"
              :class="activeTab === 'files' ? 'border-[#3B1770] font-semibold text-[#3B1770]' : 'border-transparent text-[#6B6B6B]'"
              @click="activeTab = 'files'"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M14 3v4a1 1 0 0 0 1 1h4M8 3h6l6 6v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              </svg>
              Files
            </button>
          </div>

          <!-- Tree list -->
          <div class="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
            <template v-if="activeTab === 'connections'">
              <div v-for="connection in CONNECTIONS" :key="connection.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-[#F5F1FC]"
                  @click="toggleExpanded(connection.id)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-3 w-3 flex-shrink-0 text-[#6B6B6B] transition-transform"
                    :class="isExpanded(connection.id) ? 'rotate-90' : ''"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <img
                    :src="CONNECTOR_ICONS[connection.connector]"
                    alt=""
                    class="h-3.5 w-3.5 flex-shrink-0 object-contain"
                  />
                  <span class="min-w-0 flex-1 truncate text-[12px] text-[#25262E]">{{ connection.name }}</span>
                </button>

                <p v-if="isExpanded(connection.id)" class="pb-1 pl-8 text-[11px] text-[#9A9A9A]">
                  Entities load here.
                </p>
              </div>
            </template>

            <p v-else class="px-1.5 py-2 text-[11px] text-[#9A9A9A]">No files uploaded yet.</p>
          </div>

          <!-- Footer action -->
          <div class="flex-shrink-0 px-3 py-2.5">
            <button
              type="button"
              class="w-full rounded border border-[#D8D8D8] py-2 text-[12px] text-[#25262E] transition-colors hover:border-[#3B1770] hover:text-[#3B1770]"
              @click="onAddSqlEntity"
            >
              Add SQL Entity
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-update-overlay {
  background: rgba(255, 255, 255, 0.45);
}
.preview-update-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 25%,
    rgba(255, 255, 255, 0.8) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: preview-shimmer 1.4s ease-in-out infinite;
}
@keyframes preview-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
