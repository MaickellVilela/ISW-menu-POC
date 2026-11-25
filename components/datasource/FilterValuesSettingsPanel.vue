<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import {
  mappedTargetFields,
  mappingLabel,
  useFilterValueConfiguration,
  type FileFilterValueProvider,
  type FilterValueMapping,
  type FilterValueProvider,
} from '~/composables/useFilterValueConfiguration';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import FileApiEndpointsModal from './FileApiEndpointsModal.vue';
import FilterValueFileEditorModal from './FilterValueFileEditorModal.vue';
import FilterValueSourceModal from './FilterValueSourceModal.vue';
import SourcePreviewModal from './SourcePreviewModal.vue';

const props = defineProps<{
  targetFields: FieldOption[];
  sourceName: string;
  autoOpenSource?: boolean;
  initialSourceId?: string;
  openMapping?: boolean;
}>();

const {
  configuration,
  load,
  saveSource,
  updateProvider,
  removeSource,
} = useFilterValueConfiguration();

type SourceDialog = 'preview' | 'api' | 'file';

const showSourceModal = ref(false);
const sourceModalStep = ref<'source' | 'mapping'>('source');
/** Source being edited in the modal; null while adding a new one. */
const editingSourceId = ref<string | null>(null);
/** Canvas table to preselect when the modal adds a new source. */
const preselectedSourceId = ref('');
const dialog = ref<{ kind: SourceDialog; providerId: string } | null>(null);
const removalSourceId = ref<string | null>(null);

const sources = computed(() => configuration.value.sources);
const mappingCount = computed(() =>
  sources.value.reduce((total, source) => total + source.mappings.length, 0),
);

function findSource(providerId: string | null | undefined) {
  return sources.value.find((source) => source.provider.id === providerId) ?? null;
}

const editingSource = computed(() => findSource(editingSourceId.value));

/** A data-source field takes its values from one source, so fields mapped elsewhere are off the list. */
const modalTargetFields = computed(() => {
  const taken = mappedTargetFields(sources.value, editingSourceId.value ?? '');
  return props.targetFields.filter((field) => !taken.has(field.value));
});

const dialogProvider = computed<FilterValueProvider | null>(
  () => findSource(dialog.value?.providerId)?.provider ?? null,
);
const dialogFileProvider = computed<FileFilterValueProvider | null>(() =>
  dialogProvider.value?.kind === 'file' ? dialogProvider.value : null,
);

load();

watch(
  () => [props.autoOpenSource, props.openMapping, props.initialSourceId] as const,
  ([shouldOpen, openMapping, sourceId]) => {
    if (!shouldOpen) return;
    const existing = findSource(sourceId);
    if (existing) openSource(existing.provider.id, openMapping ? 'mapping' : 'source');
    else addSource(sourceId ?? '');
  },
  { immediate: true },
);

function addSource(preselectId = ''): void {
  editingSourceId.value = null;
  preselectedSourceId.value = preselectId;
  sourceModalStep.value = 'source';
  showSourceModal.value = true;
}

function openSource(providerId: string, step: 'source' | 'mapping'): void {
  editingSourceId.value = providerId;
  preselectedSourceId.value = '';
  sourceModalStep.value = step;
  showSourceModal.value = true;
}

function saveConfiguration(
  provider: FilterValueProvider,
  mappings: FilterValueMapping[],
): void {
  // Adding a source that is already listed extends it instead of replacing its mappings.
  const alreadyListed = editingSourceId.value ? null : findSource(provider.id);
  saveSource(
    provider,
    alreadyListed ? [...alreadyListed.mappings, ...mappings] : mappings,
    editingSourceId.value ?? provider.id,
  );
  showSourceModal.value = false;
  removalSourceId.value = null;
}

function saveFileProvider(provider: FileFilterValueProvider): void {
  updateProvider(provider);
  dialog.value = null;
}

function confirmRemoveSource(providerId: string): void {
  removeSource(providerId);
  removalSourceId.value = null;
}

/** Names the entity too: with several sources, a bare "id" doesn't say whose id it is. */
function targetLabel(mapping: FilterValueMapping): string {
  const field = props.targetFields.find((candidate) => candidate.value === mapping.targetField);
  return field ? `${field.entity} · ${field.name}` : mappingLabel(mapping, props.targetFields);
}

function sourceSubtitle(provider: FilterValueProvider): string {
  return provider.kind === 'entity'
    ? `${provider.connection.name} · Entity`
    : `${provider.file.name} · ${provider.file.kind}`;
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-7 lg:px-10 lg:py-9">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-[#25262E]">Performance filters</h1>
        <p class="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">
          Prepare lookup values for future filter UIs. This does not filter this source's output.
        </p>
        <p class="mt-1 text-xs text-[#9A9A9A]">Previously called "Filter value entity".</p>
      </div>
      <button
        v-if="sources.length > 0"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md bg-[#3B1770] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C]"
        @click="addSource()"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Add value source
      </button>
    </header>

    <div
      v-if="sources.length === 0"
      class="mt-7 overflow-hidden rounded-xl border border-[#E2E2E2] bg-white"
    >
      <div class="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_17rem] md:items-center">
        <div>
          <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 5h16M4 12h10M4 19h7" stroke-linecap="round" />
              <circle cx="18" cy="15" r="3" />
              <path d="M18 11v1M18 18v1M14 15h1M21 15h1" stroke-linecap="round" />
            </svg>
          </span>
          <h2 class="mt-4 text-base font-semibold text-[#25262E]">No value source configured</h2>
          <p class="mt-1 max-w-lg text-sm leading-relaxed text-[#667085]">
            Pick a prepared entity or file, then map its columns to fields in {{ sourceName }}.
            Add another source whenever a field takes its values from somewhere else.
          </p>
          <button
            type="button"
            class="mt-5 rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C]"
            @click="addSource()"
          >
            Choose value source
          </button>
        </div>

        <div class="rounded-lg border border-[#E2E2E2] bg-[#FAFAFA] p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-[#7A7A7A]">Example</p>
          <div class="mt-3 rounded-md border border-[#D8DCE2] bg-white p-3">
            <p class="text-xs text-[#667085]">Primary field</p>
            <p class="mt-0.5 text-sm font-medium text-[#25262E]">orders.status</p>
          </div>
          <div class="my-2 flex justify-center text-[#8A8A8A]">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4v16M7 15l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="rounded-md border border-[#C9B8EC] bg-[#F8F6FC] p-3">
            <p class="text-xs text-[#72549B]">Prepared value column</p>
            <p class="mt-0.5 text-sm font-medium text-[#3B1770]">status_reference.status_code</p>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <p class="mt-6 text-xs text-[#667085]">
        {{ sources.length }} value source{{ sources.length === 1 ? '' : 's' }} ·
        {{ mappingCount }} mapped field{{ mappingCount === 1 ? '' : 's' }}
      </p>

      <!-- One card per value source: the source, then the fields it supplies -->
      <section
        v-for="source in sources"
        :key="source.provider.id"
        class="mt-3 overflow-hidden rounded-xl border border-[#C9B8EC] bg-white shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
              <img
                v-if="source.provider.kind === 'entity'"
                :src="CONNECTOR_ICONS[source.provider.connection.connector]"
                alt=""
                class="h-6 w-6 object-contain"
              />
              <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9ZM8 7H11V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z" />
              </svg>
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <h2 class="truncate text-base font-semibold text-[#25262E]">{{ source.provider.name }}</h2>
                <span class="rounded-full bg-[#EAF6EF] px-2 py-0.5 text-[10px] font-semibold text-[#257A4A]">Ready</span>
              </span>
              <p class="mt-1 text-xs text-[#667085]">{{ sourceSubtitle(source.provider) }}</p>
            </span>
          </div>

          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="openSource(source.provider.id, 'source')"
          >
            Replace source
          </button>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2 px-5 pb-4">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="dialog = { kind: 'preview', providerId: source.provider.id }"
          >
            Preview
          </button>
          <template v-if="source.provider.kind === 'file'">
            <button
              type="button"
              class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
              @click="dialog = { kind: 'api', providerId: source.provider.id }"
            >
              API endpoints
            </button>
            <button
              type="button"
              class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
              @click="dialog = { kind: 'file', providerId: source.provider.id }"
            >
              Edit file
            </button>
          </template>

          <span class="ml-auto flex flex-wrap items-center gap-3">
            <button
              v-if="removalSourceId !== source.provider.id"
              type="button"
              class="text-xs font-medium text-[#B4232D] hover:underline"
              @click="removalSourceId = source.provider.id"
            >
              Remove
            </button>
            <template v-else>
              <span class="text-xs text-[#52525B]">Remove this source and its mappings?</span>
              <button type="button" class="text-xs font-semibold text-[#B4232D] hover:underline" @click="confirmRemoveSource(source.provider.id)">
                Remove
              </button>
              <button type="button" class="text-xs font-medium text-[#52525B] hover:underline" @click="removalSourceId = null">
                Cancel
              </button>
            </template>
          </span>
        </div>

        <div class="border-t border-[#EAEAEA] bg-[#FCFBFE]">
          <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
            <h3 class="text-xs font-semibold text-[#25262E]">
              Field mappings
              <span class="ml-1 font-normal text-[#667085]">{{ source.mappings.length }}</span>
            </h3>
            <button
              type="button"
              class="text-xs font-medium text-[#3B1770] hover:underline"
              @click="openSource(source.provider.id, 'mapping')"
            >
              Edit mappings
            </button>
          </div>

          <div class="divide-y divide-[#F0F0F0] border-t border-[#F0F0F0] bg-white">
            <div
              v-for="mapping in source.mappings"
              :key="mapping.id"
              class="grid gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] sm:items-center"
            >
              <div class="min-w-0">
                <p class="text-[11px] text-[#7A7A7A]">Data-source field</p>
                <p class="mt-0.5 truncate text-sm font-medium text-[#25262E]">
                  {{ targetLabel(mapping) }}
                </p>
              </div>
              <svg viewBox="0 0 24 24" class="hidden h-4 w-4 text-[#8A8A8A] sm:block" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M14 7l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="min-w-0">
                <p class="text-[11px] text-[#7A7A7A]">Prepared value</p>
                <p class="mt-0.5 truncate text-sm font-medium text-[#3B1770]">
                  {{ source.provider.name }}.{{ mapping.valueField }}
                </p>
                <p v-if="mapping.labelField" class="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
                  Label: {{ mapping.labelField }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-5 rounded-xl border border-[#E2E2E2] bg-[#FAFAFA] p-5">
        <h2 class="text-sm font-semibold text-[#25262E]">How this is used</h2>
        <p class="mt-1 text-sm leading-relaxed text-[#667085]">
          Filter controls query these prepared sources for options, each field from the source it is mapped to. The source output still returns every row until a viewer applies a filter.
        </p>
      </section>
    </template>

    <FilterValueSourceModal
      :open="showSourceModal"
      :target-fields="modalTargetFields"
      :existing-provider="editingSource?.provider ?? null"
      :existing-mappings="editingSource?.mappings ?? []"
      :initial-step="sourceModalStep"
      :initial-source-id="preselectedSourceId"
      origin-label="Performance filters"
      @cancel="showSourceModal = false"
      @save="saveConfiguration"
    />

    <SourcePreviewModal
      :open="dialog?.kind === 'preview'"
      :provider="dialogProvider"
      @close="dialog = null"
    />

    <FileApiEndpointsModal
      :open="dialog?.kind === 'api'"
      :provider="dialogFileProvider"
      @close="dialog = null"
    />

    <FilterValueFileEditorModal
      :open="dialog?.kind === 'file'"
      :provider="dialogFileProvider"
      @close="dialog = null"
      @save="saveFileProvider"
    />
  </div>
</template>
