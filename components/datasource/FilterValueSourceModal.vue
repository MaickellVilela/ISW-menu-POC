<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DATA_SOURCE_FILES,
  type DataSourceFile,
  type SourceCatalogSelection,
} from '~/composables/dataSourceCatalog';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import {
  areFilterValueMappingsValid,
  createFilterValueMapping,
  providerFromCatalogSelection,
  type FilterValueMapping,
  type FilterValueProvider,
} from '~/composables/useFilterValueConfiguration';
import FilterValueMappingEditor from './FilterValueMappingEditor.vue';
import SourcePanel from './SourcePanel.vue';
import SourcePreviewModal from './SourcePreviewModal.vue';

type ConfigurationStep = 'source' | 'mapping';

const props = withDefaults(
  defineProps<{
    open: boolean;
    targetFields: FieldOption[];
    existingProvider?: FilterValueProvider | null;
    existingMappings?: FilterValueMapping[];
    initialStep?: ConfigurationStep;
  }>(),
  {
    existingProvider: null,
    existingMappings: () => [],
    initialStep: 'source',
  },
);

const emit = defineEmits<{
  cancel: [];
  save: [provider: FilterValueProvider, mappings: FilterValueMapping[]];
}>();

const step = ref<ConfigurationStep>('source');
const selectedProvider = ref<FilterValueProvider | null>(null);
const mappings = ref<FilterValueMapping[]>([]);
const showPreview = ref(false);

const pickerFiles = computed<DataSourceFile[]>(() => {
  const provider = selectedProvider.value;
  if (provider?.kind !== 'file') return DATA_SOURCE_FILES;
  return [
    {
      id: provider.file.id,
      name: provider.file.name,
      kind: provider.file.kind,
      sourceItem: provider.sourceItem,
    },
    ...DATA_SOURCE_FILES.filter((file) => file.id !== provider.file.id),
  ];
});

const canContinue = computed(() =>
  Boolean(selectedProvider.value?.sourceItem.fields.length),
);
const canApply = computed(() =>
  Boolean(selectedProvider.value) && areFilterValueMappingsValid(mappings.value),
);

function newMapping(provider: FilterValueProvider): FilterValueMapping {
  const firstTarget = props.targetFields[0];
  const matchingProviderField = provider.sourceItem.fields.find((field) =>
    field.name.trim().toLowerCase() === firstTarget?.name.trim().toLowerCase(),
  );
  return createFilterValueMapping(
    `mapping-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    firstTarget,
    matchingProviderField ?? provider.sourceItem.fields[0],
  );
}

function reset(): void {
  selectedProvider.value = props.existingProvider;
  mappings.value = props.existingMappings.map((mapping) => ({ ...mapping }));
  step.value = props.initialStep === 'mapping' && props.existingProvider
    ? 'mapping'
    : 'source';
}

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
  { immediate: true },
);

function selectSource(selection: SourceCatalogSelection): void {
  const provider = providerFromCatalogSelection(selection);
  const changedProvider = selectedProvider.value?.id !== provider.id;
  if (!changedProvider) return;
  selectedProvider.value = provider;
  mappings.value = props.targetFields.length > 0 && provider.sourceItem.fields.length > 0
    ? [newMapping(provider)]
    : [];
}

function continueToMappings(): void {
  if (!selectedProvider.value || !canContinue.value) return;
  if (mappings.value.length === 0 && props.targetFields.length > 0) {
    mappings.value = [newMapping(selectedProvider.value)];
  }
  step.value = 'mapping';
}

function save(): void {
  if (!selectedProvider.value || !canApply.value) return;
  emit(
    'save',
    selectedProvider.value,
    mappings.value.map((mapping) => ({ ...mapping })),
  );
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <section
        class="flex h-[min(46rem,calc(100vh-2rem))] w-[min(70rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Configure filter values"
      >
        <header class="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[#E2E2E2] px-6 py-4">
          <div class="flex items-center gap-2">
            <button
              v-if="step === 'mapping'"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
              aria-label="Back to source selection"
              @click="step = 'source'"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m14.5 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div>
              <h2 class="text-xl font-semibold text-[#25262E]">
                {{ step === 'source' ? 'Choose a value source' : 'Configure filter values' }}
              </h2>
              <p class="mt-0.5 text-xs text-[#667085]">
                {{ step === 'source' ? 'Select one prepared entity or file.' : 'Map data-source fields to prepared values.' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
            aria-label="Close filter value configuration"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <template v-if="step === 'source'">
          <div class="flex min-h-0 flex-1">
            <div class="w-[22rem] flex-shrink-0 border-r border-[#E2E2E2]">
              <SourcePanel
                mode="select"
                :initial-files="pickerFiles"
                :selected-source-id="selectedProvider?.id ?? ''"
                @source-selected="selectSource"
              />
            </div>

            <div class="min-w-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-7">
              <div class="mx-auto max-w-lg">
                <h3 class="text-base font-semibold text-[#25262E]">Prepared value provider</h3>
                <p class="mt-1 text-sm leading-relaxed text-[#667085]">
                  This source is queried for its small reference set only. It is not added to the data-source canvas or joined to the primary dataset.
                </p>

                <div
                  v-if="selectedProvider"
                  class="mt-6 rounded-xl border border-[#C9B8EC] bg-white p-5 shadow-sm"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
                      <img
                        v-if="selectedProvider.kind === 'entity'"
                        :src="CONNECTOR_ICONS[selectedProvider.connection.connector]"
                        alt=""
                        class="h-6 w-6 object-contain"
                      />
                      <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                        <path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9ZM8 7H11V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z" />
                      </svg>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-semibold text-[#25262E]">{{ selectedProvider.name }}</span>
                      <span class="mt-0.5 block text-xs text-[#667085]">
                        {{
                          selectedProvider.kind === 'entity'
                            ? `${selectedProvider.connection.name} · ${selectedProvider.sourceItem.fields.length} columns`
                            : `${selectedProvider.file.kind} · ${selectedProvider.sourceItem.fields.length} columns`
                        }}
                      </span>
                    </span>
                    <span class="rounded-full bg-[#EAF6EF] px-2 py-1 text-[10px] font-semibold text-[#257A4A]">Selected</span>
                  </div>
                </div>

                <div v-else class="mt-6 rounded-xl border border-dashed border-[#C9CED6] bg-white px-6 py-12 text-center">
                  <p class="text-sm font-medium text-[#25262E]">No source selected</p>
                  <p class="mt-1 text-xs text-[#667085]">Choose an entity or file from the browser.</p>
                </div>
              </div>
            </div>
          </div>

          <footer class="flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-6 py-4">
            <button
              type="button"
              class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
              :disabled="!canContinue"
              @click="continueToMappings"
            >
              Continue
            </button>
          </footer>
        </template>

        <template v-else-if="selectedProvider">
          <div class="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
            <div class="mx-auto max-w-3xl">
              <div class="mb-5 flex items-center justify-between gap-4 rounded-lg border border-[#E2E2E2] bg-white px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-[#25262E]">{{ selectedProvider.name }}</p>
                  <p class="mt-0.5 text-xs text-[#667085]">{{ selectedProvider.sourceItem.fields.length }} available columns</p>
                </div>
                <button
                  type="button"
                  class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
                  @click="showPreview = true"
                >
                  Preview source
                </button>
              </div>

              <FilterValueMappingEditor
                v-model="mappings"
                :provider="selectedProvider"
                :target-fields="targetFields"
              />
            </div>
          </div>

          <footer class="flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-6 py-4">
            <button
              type="button"
              class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
              :disabled="!canApply"
              @click="save"
            >
              Apply
            </button>
          </footer>
        </template>
      </section>

      <SourcePreviewModal
        :open="showPreview"
        :provider="selectedProvider"
        @close="showPreview = false"
      />
    </div>
  </Teleport>
</template>
