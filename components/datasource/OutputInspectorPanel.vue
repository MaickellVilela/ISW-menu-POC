<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  directFieldCandidates,
  outputFieldRows,
  type CanvasNode,
  type FieldCapabilities,
  type MetricAggregation,
  type OutputTranslationFile,
} from '~/composables/useDataSourceCanvas';
import OutputFieldActionModal, { type OutputModalMode } from './OutputFieldActionModal.vue';

const props = defineProps<{
  node: CanvasNode;
  allNodes: CanvasNode[];
}>();

const emit = defineEmits<{
  close: [];
  'add-direct-field': [payload: { nodeId: string; fieldName: string }];
  'remove-direct-field': [id: string];
  'add-custom-metric': [payload: { name: string; sourceField: string; aggregation: MetricAggregation }];
  'remove-custom-metric': [id: string];
  'set-field-capabilities': [payload: { key: string; capabilities: FieldCapabilities }];
  'set-translation-file': [file: OutputTranslationFile | undefined];
}>();

const fieldsOpen = ref(true);
const expandedKey = ref<string | null>(null);
const activeModal = ref<OutputModalMode | null>(null);

const fieldRows = computed(() => outputFieldRows(props.allNodes, props.node));
const directFieldOptions = computed(() => directFieldCandidates(props.allNodes));
const metricFieldOptions = computed(() =>
  fieldRows.value
    .filter((row) => row.origin !== 'metric')
    .map((row) => ({ value: row.key, label: row.name })),
);

const originLabel: Record<string, string> = { derived: 'Derived', direct: 'Direct', metric: 'Metric' };
const originClass: Record<string, string> = {
  derived: 'bg-[#EEF0F3] text-[#52525B]',
  direct: 'bg-[#F1ECFA] text-[#3B1770]',
  metric: 'bg-[#FBEFE0] text-[#9A5B13]',
};

function toggleExpanded(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key;
}

function updateCapability(key: string, capabilities: FieldCapabilities, patch: Partial<FieldCapabilities>): void {
  emit('set-field-capabilities', { key, capabilities: { ...capabilities, ...patch } });
}

function removeRow(row: { origin: string; removeId?: string }): void {
  if (!row.removeId) return;
  if (row.origin === 'direct') emit('remove-direct-field', row.removeId);
  else if (row.origin === 'metric') emit('remove-custom-metric', row.removeId);
}

function openModal(mode: OutputModalMode): void {
  activeModal.value = mode;
}

function onSaveDirectField(payload: { nodeId: string; fieldName: string }): void {
  emit('add-direct-field', payload);
  activeModal.value = null;
}

function onSaveCustomMetric(payload: { name: string; sourceField: string; aggregation: MetricAggregation }): void {
  emit('add-custom-metric', payload);
  activeModal.value = null;
}

function onSaveTranslation(payload: OutputTranslationFile): void {
  emit('set-translation-file', payload);
  activeModal.value = null;
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <header class="flex-shrink-0 border-b border-[#EAEAEA] px-3 py-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-medium text-[#667085] transition-colors hover:bg-[#F5F1FC] hover:text-[#3B1770]"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m14.5 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Connections
      </button>
      <h1 class="mt-1 text-sm font-semibold text-[#25262E]">Output</h1>
    </header>

    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <section class="overflow-hidden rounded-lg border border-[#E2E2E2]">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2.5 text-left"
          :aria-expanded="fieldsOpen"
          @click="fieldsOpen = !fieldsOpen"
        >
          <span class="text-sm font-semibold text-[#25262E]">Final Fields</span>
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 text-[#6B6B6B] transition-transform"
            :class="fieldsOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div v-if="fieldsOpen" class="space-y-2 border-t border-[#EAEAEA] px-3 py-3">
          <ul class="max-h-72 overflow-auto rounded-md border border-[#E2E2E2]">
            <li v-for="row in fieldRows" :key="row.key" class="border-b border-[#F0F0F0] last:border-b-0">
              <div class="flex items-start gap-2 px-2.5 py-2">
                <div class="min-w-0 flex-1">
                  <span class="flex items-center gap-1.5">
                    <span class="truncate text-sm font-medium text-[#25262E]">{{ row.name }}</span>
                    <span class="flex-shrink-0 rounded-full px-1.5 py-0 text-[9px] font-semibold" :class="originClass[row.origin]">
                      {{ originLabel[row.origin] }}
                    </span>
                  </span>
                  <span class="block text-[11px] text-[#9A9A9A]">{{ row.type }}</span>
                </div>
                <button
                  type="button"
                  class="flex-shrink-0 rounded p-1 text-[11px] font-medium text-[#667085] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
                  @click="toggleExpanded(row.key)"
                >
                  Capabilities
                </button>
                <button
                  v-if="row.removeId"
                  type="button"
                  class="flex-shrink-0 rounded p-1 text-[#9A9A9A] hover:bg-[#FEF3F2] hover:text-[#C81E1E]"
                  aria-label="Remove field"
                  @click="removeRow(row)"
                >
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
              <div v-if="expandedKey === row.key" class="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[#F0F0F0] bg-[#FAFAFA] px-3 py-2">
                <label
                  v-for="capability in (['hidden', 'aggregatable', 'sortable', 'filterable'] as const)"
                  :key="capability"
                  class="inline-flex items-center gap-1.5 text-xs text-[#25262E]"
                >
                  <input
                    type="checkbox"
                    class="h-3.5 w-3.5 accent-[#3B1770]"
                    :checked="row.capabilities[capability] ?? false"
                    @change="updateCapability(row.key, row.capabilities, { [capability]: ($event.target as HTMLInputElement).checked })"
                  />
                  {{ capability.charAt(0).toUpperCase() + capability.slice(1) }}
                </label>
              </div>
            </li>
            <li v-if="fieldRows.length === 0" class="px-2.5 py-4 text-center text-[11px] text-[#7A7A7A]">
              Connect a table to Output to see its fields here.
            </li>
          </ul>
        </div>
      </section>

      <section class="space-y-2 rounded-lg border border-[#E2E2E2] p-3">
        <span class="block text-sm font-semibold text-[#25262E]">Field Actions</span>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="openModal('direct-field')"
        >
          Add direct field
          <span class="text-[#9A9A9A]">+</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="openModal('custom-metric')"
        >
          Add custom metric
          <span class="text-[#9A9A9A]">+</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="openModal('translation')"
        >
          <span>
            Update translation file
            <span v-if="node.translationFile" class="mt-0.5 block text-[11px] text-[#7A7A7A]">
              {{ node.translationFile.fileName }} · {{ node.translationFile.locale }}
            </span>
          </span>
          <span class="text-[#9A9A9A]">+</span>
        </button>
      </section>
    </div>

    <OutputFieldActionModal
      :open="activeModal !== null"
      :mode="activeModal"
      :direct-field-options="directFieldOptions"
      :metric-field-options="metricFieldOptions"
      :current-translation="node.translationFile"
      @cancel="activeModal = null"
      @save-direct-field="onSaveDirectField"
      @save-custom-metric="onSaveCustomMetric"
      @save-translation="onSaveTranslation"
    />
  </div>
</template>
