<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import {
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
}>();

const {
  configuration,
  load,
  save,
  updateProvider,
  clear,
} = useFilterValueConfiguration();

const showSourceModal = ref(false);
const sourceModalStep = ref<'source' | 'mapping'>('source');
const showPreview = ref(false);
const showApiEndpoints = ref(false);
const showFileEditor = ref(false);
const confirmRemoval = ref(false);

const fileProvider = computed<FileFilterValueProvider | null>(() =>
  configuration.value.provider?.kind === 'file'
    ? configuration.value.provider
    : null,
);

onMounted(load);

function openSourceSelection(): void {
  sourceModalStep.value = 'source';
  showSourceModal.value = true;
}

function openMappingEditor(): void {
  sourceModalStep.value = 'mapping';
  showSourceModal.value = true;
}

function saveConfiguration(
  provider: FilterValueProvider,
  mappings: FilterValueMapping[],
): void {
  save(provider, mappings);
  showSourceModal.value = false;
  confirmRemoval.value = false;
}

function saveFileProvider(provider: FileFilterValueProvider): void {
  updateProvider(provider);
  showFileEditor.value = false;
}

function removeConfiguration(): void {
  clear();
  confirmRemoval.value = false;
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-7 lg:px-10 lg:py-9">
    <header>
      <h1 class="text-xl font-semibold text-[#25262E]">Filter values</h1>
      <p class="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">
        Use a small prepared source to populate filter choices without scanning the full dataset.
      </p>
    </header>

    <div
      v-if="!configuration.provider"
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
            Select one prepared entity or file, then map its columns to fields in {{ sourceName }}.
          </p>
          <button
            type="button"
            class="mt-5 rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C]"
            @click="openSourceSelection"
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
      <section class="mt-7 rounded-xl border border-[#C9B8EC] bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
              <img
                v-if="configuration.provider.kind === 'entity'"
                :src="CONNECTOR_ICONS[configuration.provider.connection.connector]"
                alt=""
                class="h-6 w-6 object-contain"
              />
              <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9ZM8 7H11V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z" />
              </svg>
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <h2 class="truncate text-base font-semibold text-[#25262E]">{{ configuration.provider.name }}</h2>
                <span class="rounded-full bg-[#EAF6EF] px-2 py-0.5 text-[10px] font-semibold text-[#257A4A]">Ready</span>
              </span>
              <p class="mt-1 text-xs text-[#667085]">
                {{
                  configuration.provider.kind === 'entity'
                    ? `${configuration.provider.connection.name} · Entity`
                    : `${configuration.provider.file.name} · ${configuration.provider.file.kind}`
                }}
              </p>
            </span>
          </div>

          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="openSourceSelection"
          >
            Replace source
          </button>
        </div>

        <div class="mt-5 flex flex-wrap gap-2 border-t border-[#EAEAEA] pt-4">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="showPreview = true"
          >
            Preview
          </button>
          <button
            v-if="fileProvider"
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="showApiEndpoints = true"
          >
            API endpoints
          </button>
          <button
            v-if="fileProvider"
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="showFileEditor = true"
          >
            Edit file
          </button>
        </div>
      </section>

      <section class="mt-5 overflow-hidden rounded-xl border border-[#E2E2E2] bg-white">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAEAEA] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#25262E]">Field mappings</h2>
            <p class="mt-0.5 text-xs text-[#667085]">
              {{ configuration.mappings.length }} configured mapping{{ configuration.mappings.length === 1 ? '' : 's' }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="openMappingEditor"
          >
            Edit mappings
          </button>
        </div>

        <div class="divide-y divide-[#F0F0F0]">
          <div
            v-for="mapping in configuration.mappings"
            :key="mapping.id"
            class="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] sm:items-center"
          >
            <div class="min-w-0">
              <p class="text-[11px] text-[#7A7A7A]">Data-source field</p>
              <p class="mt-0.5 truncate text-sm font-medium text-[#25262E]">
                {{ mappingLabel(mapping, targetFields) }}
              </p>
            </div>
            <svg viewBox="0 0 24 24" class="hidden h-4 w-4 text-[#8A8A8A] sm:block" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M14 7l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div class="min-w-0">
              <p class="text-[11px] text-[#7A7A7A]">Prepared value</p>
              <p class="mt-0.5 truncate text-sm font-medium text-[#3B1770]">
                {{ configuration.provider.name }}.{{ mapping.valueField }}
              </p>
              <p v-if="mapping.labelField" class="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
                Label: {{ mapping.labelField }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-5 rounded-xl border border-[#E2E2E2] bg-[#FAFAFA] p-5">
        <h2 class="text-sm font-semibold text-[#25262E]">How this is used</h2>
        <p class="mt-1 text-sm leading-relaxed text-[#667085]">
          Filter controls query this prepared source for options. Queries against the primary dataset still run only when a viewer applies a filter.
        </p>
      </section>

      <div class="mt-5 border-t border-[#E2E2E2] pt-4">
        <button
          v-if="!confirmRemoval"
          type="button"
          class="text-xs font-medium text-[#B4232D] hover:underline"
          @click="confirmRemoval = true"
        >
          Remove value source
        </button>
        <div v-else class="flex flex-wrap items-center gap-3">
          <p class="text-xs text-[#52525B]">Remove this provider and all field mappings?</p>
          <button type="button" class="text-xs font-semibold text-[#B4232D] hover:underline" @click="removeConfiguration">
            Remove
          </button>
          <button type="button" class="text-xs font-medium text-[#52525B] hover:underline" @click="confirmRemoval = false">
            Cancel
          </button>
        </div>
      </div>
    </template>

    <FilterValueSourceModal
      :open="showSourceModal"
      :target-fields="targetFields"
      :existing-provider="configuration.provider"
      :existing-mappings="configuration.mappings"
      :initial-step="sourceModalStep"
      @cancel="showSourceModal = false"
      @save="saveConfiguration"
    />

    <SourcePreviewModal
      :open="showPreview"
      :provider="configuration.provider"
      @close="showPreview = false"
    />

    <FileApiEndpointsModal
      :open="showApiEndpoints"
      :provider="fileProvider"
      @close="showApiEndpoints = false"
    />

    <FilterValueFileEditorModal
      :open="showFileEditor"
      :provider="fileProvider"
      @close="showFileEditor = false"
      @save="saveFileProvider"
    />
  </div>
</template>
