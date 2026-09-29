<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  outputCustomMetricRows,
  outputFieldCandidates,
  outputFieldRows,
  type CanvasNode,
  type FieldCapabilities,
  type OutputTranslationFile,
} from '~/composables/useDataSourceCanvas';
import OutputExpressionEditorModal, {
  type ExpressionEditorDraft,
  type ExpressionEditorMode,
} from './OutputExpressionEditorModal.vue';
import HierarchyFieldModal from './HierarchyFieldModal.vue';
import BulkFieldCapabilitiesModal from './BulkFieldCapabilitiesModal.vue';

const props = defineProps<{
  node: CanvasNode;
  allNodes: CanvasNode[];
}>();

const emit = defineEmits<{
  close: [];
  'add-derived-field': [payload: { name: string; expression: string }];
  'update-derived-field': [payload: { id: string; name: string; expression: string }];
  'remove-derived-field': [id: string];
  'add-hierarchy-field': [payload: { label: string; parentField: string; childField: string; labelField?: string }];
  'remove-hierarchy-field': [id: string];
  'add-custom-metric': [payload: { name: string; expression: string }];
  'update-custom-metric': [payload: { id: string; name: string; expression: string }];
  'remove-custom-metric': [id: string];
  'set-field-label': [payload: { key: string; label: string }];
  'set-bulk-field-capabilities': [patch: Record<string, FieldCapabilities>];
  'set-translation-file': [file: OutputTranslationFile];
}>();

const activeTab = ref<'fields' | 'metrics'>('fields');
const query = ref('');
const expandedKey = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const expressionModal = ref<{ mode: ExpressionEditorMode; editing: ExpressionEditorDraft | null } | null>(null);
const hierarchyModalOpen = ref(false);
const bulkCapabilitiesOpen = ref(false);

const fieldRows = computed(() => outputFieldRows(props.allNodes, props.node));
const customMetricRows = computed(() => outputCustomMetricRows(props.node));
const fieldCandidates = computed(() => outputFieldCandidates(props.allNodes, props.node));
const hierarchyRows = computed(() => props.node.hierarchyFields ?? []);

function fieldLabelFor(value: string): string {
  return fieldCandidates.value.find((option) => option.value === value)?.name ?? value;
}

const visibleFieldRows = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return fieldRows.value;
  return fieldRows.value.filter((row) => row.label.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle));
});

const visibleMetricRows = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return customMetricRows.value;
  return customMetricRows.value.filter((row) => row.name.toLowerCase().includes(needle));
});

function toggleExpanded(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key;
}

function onLabelInput(key: string, event: Event): void {
  emit('set-field-label', { key, label: (event.target as HTMLInputElement).value });
}

function removeField(row: { origin: string; removeId?: string }): void {
  if (row.removeId) emit('remove-derived-field', row.removeId);
}

function openDerivedFieldModal(row?: { removeId?: string; name: string; expression?: string }): void {
  expressionModal.value = {
    mode: 'derived-field',
    editing: row?.removeId ? { id: row.removeId, name: row.name, expression: row.expression ?? '' } : null,
  };
}

function openCustomMetricModal(row?: { removeId: string; name: string; expression: string }): void {
  expressionModal.value = {
    mode: 'custom-metric',
    editing: row ? { id: row.removeId, name: row.name, expression: row.expression } : null,
  };
}

function onSaveDerivedField(payload: { id?: string; name: string; expression: string }): void {
  if (payload.id) emit('update-derived-field', { id: payload.id, name: payload.name, expression: payload.expression });
  else emit('add-derived-field', { name: payload.name, expression: payload.expression });
  expressionModal.value = null;
}

function onSaveCustomMetric(payload: { id?: string; name: string; expression: string }): void {
  if (payload.id) emit('update-custom-metric', { id: payload.id, name: payload.name, expression: payload.expression });
  else emit('add-custom-metric', { name: payload.name, expression: payload.expression });
  expressionModal.value = null;
}

function onSaveHierarchyField(payload: { label: string; parentField: string; childField: string; labelField?: string }): void {
  emit('add-hierarchy-field', payload);
  hierarchyModalOpen.value = false;
}

function onSaveBulkCapabilities(patch: Record<string, FieldCapabilities>): void {
  emit('set-bulk-field-capabilities', patch);
  bulkCapabilitiesOpen.value = false;
}

function triggerTranslationUpload(): void {
  fileInput.value?.click();
}

function onTranslationFileChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) emit('set-translation-file', { fileName: file.name });
  (event.target as HTMLInputElement).value = '';
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
      <section class="space-y-1.5 rounded-lg border border-[#E2E2E2] p-3">
        <span class="block text-sm font-semibold text-[#25262E]">Options</span>
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="openDerivedFieldModal()"
        >
          <span class="text-[#9A9A9A]">+</span> Add Derived Field
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="hierarchyModalOpen = true"
        >
          <span class="text-[#9A9A9A]">+</span> Add Hierarchy Field
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="openCustomMetricModal()"
        >
          <span class="text-[#9A9A9A]">+</span> Add Custom Metric
        </button>
        <button
          type="button"
          class="w-full rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="triggerTranslationUpload"
        >
          Upload Translation File
          <span v-if="node.translationFile" class="mt-0.5 block text-[11px] text-[#7A7A7A]">{{ node.translationFile.fileName }}</span>
        </button>
        <input ref="fileInput" type="file" class="hidden" @change="onTranslationFileChange" />
        <button
          type="button"
          class="w-full rounded-md border border-[#D8D8D8] px-2.5 py-2 text-left text-sm text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
          @click="bulkCapabilitiesOpen = true"
        >
          Update Field Capabilities
        </button>
      </section>

      <section class="overflow-hidden rounded-lg border border-[#E2E2E2]">
        <div class="flex border-b border-[#EAEAEA] px-1 pt-1">
          <button
            type="button"
            class="rounded-t-md px-3 py-2 text-sm font-medium"
            :class="activeTab === 'fields' ? 'border-b-2 border-[#3B1770] text-[#3B1770]' : 'text-[#667085] hover:text-[#25262E]'"
            @click="activeTab = 'fields'"
          >
            Fields
          </button>
          <button
            type="button"
            class="rounded-t-md px-3 py-2 text-sm font-medium"
            :class="activeTab === 'metrics' ? 'border-b-2 border-[#3B1770] text-[#3B1770]' : 'text-[#667085] hover:text-[#25262E]'"
            @click="activeTab = 'metrics'"
          >
            Custom Metrics
          </button>
        </div>

        <div class="space-y-2 px-3 py-3">
          <label class="relative block">
            <span class="sr-only">Search</span>
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              v-model="query"
              type="search"
              placeholder="Search"
              class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white py-1 pl-8 pr-2 text-xs text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>

          <template v-if="activeTab === 'fields'">
            <ul class="max-h-72 overflow-auto rounded-md border border-[#E2E2E2]">
              <li v-for="row in visibleFieldRows" :key="row.key" class="border-b border-[#F0F0F0] last:border-b-0">
                <div class="flex items-start gap-2 px-2.5 py-2">
                  <div class="min-w-0 flex-1">
                    <span class="flex items-center gap-1.5">
                      <span class="truncate text-sm font-medium text-[#25262E]">{{ row.label }}</span>
                      <span
                        class="flex-shrink-0 rounded-full px-1.5 py-0 text-[9px] font-semibold"
                        :class="row.origin === 'derived' ? 'bg-[#F1ECFA] text-[#3B1770]' : 'bg-[#EEF0F3] text-[#52525B]'"
                      >
                        {{ row.origin === 'derived' ? 'Derived' : 'Native' }}
                      </span>
                    </span>
                    <span class="block text-[11px] text-[#9A9A9A]">{{ row.type }}</span>
                  </div>
                  <button
                    type="button"
                    class="flex-shrink-0 rounded p-1 text-[#667085] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
                    :aria-label="expandedKey === row.key ? 'Collapse details' : 'Expand details'"
                    @click="toggleExpanded(row.key)"
                  >
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform" :class="expandedKey === row.key ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    v-if="row.removeId"
                    type="button"
                    class="flex-shrink-0 rounded p-1 text-[#9A9A9A] hover:bg-[#FEF3F2] hover:text-[#C81E1E]"
                    aria-label="Remove field"
                    @click="removeField(row)"
                  >
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
                <div v-if="expandedKey === row.key" class="space-y-2 border-t border-[#F0F0F0] bg-[#FAFAFA] px-3 py-2">
                  <label class="block">
                    <span class="mb-1 block text-[11px] font-medium text-[#52525B]">Label</span>
                    <input
                      :value="row.label"
                      type="text"
                      class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white px-2 text-xs text-[#25262E] outline-none focus:border-[#3B1770]"
                      @change="onLabelInput(row.key, $event)"
                    />
                  </label>
                  <p class="text-[11px] text-[#7A7A7A]">Data Entity: {{ row.dataEntityLabel }}</p>
                  <template v-if="row.origin === 'derived'">
                    <p class="truncate font-mono text-[11px] text-[#52525B]">{{ row.expression }}</p>
                    <button
                      type="button"
                      class="text-[11px] font-medium text-[#3B1770] hover:underline"
                      @click="openDerivedFieldModal(row)"
                    >
                      Edit expression
                    </button>
                  </template>
                </div>
              </li>
              <li v-if="visibleFieldRows.length === 0" class="px-2.5 py-4 text-center text-[11px] text-[#7A7A7A]">
                Connect a table to Output to see its fields here.
              </li>
            </ul>

            <div v-if="hierarchyRows.length > 0" class="space-y-1 pt-1">
              <span class="block text-[11px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Hierarchy Fields</span>
              <ul class="space-y-1">
                <li
                  v-for="hierarchy in hierarchyRows"
                  :key="hierarchy.id"
                  class="flex items-center justify-between gap-2 rounded-md border border-[#E2E2E2] px-2.5 py-1.5 text-xs text-[#25262E]"
                >
                  <span class="truncate">{{ hierarchy.label }}: {{ fieldLabelFor(hierarchy.parentField) }} → {{ fieldLabelFor(hierarchy.childField) }}</span>
                  <button
                    type="button"
                    class="flex-shrink-0 rounded p-1 text-[#9A9A9A] hover:bg-[#FEF3F2] hover:text-[#C81E1E]"
                    aria-label="Remove hierarchy field"
                    @click="emit('remove-hierarchy-field', hierarchy.id)"
                  >
                    <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
                    </svg>
                  </button>
                </li>
              </ul>
            </div>
          </template>

          <template v-else>
            <ul class="max-h-72 overflow-auto rounded-md border border-[#E2E2E2]">
              <li v-for="row in visibleMetricRows" :key="row.key" class="flex items-center gap-2 border-b border-[#F0F0F0] px-2.5 py-2 last:border-b-0">
                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-[#25262E]">{{ row.name }}</span>
                  <span class="block truncate font-mono text-[11px] text-[#9A9A9A]">{{ row.expression }}</span>
                </div>
                <button
                  type="button"
                  class="flex-shrink-0 rounded p-1 text-[11px] font-medium text-[#667085] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
                  @click="openCustomMetricModal(row)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="flex-shrink-0 rounded p-1 text-[#9A9A9A] hover:bg-[#FEF3F2] hover:text-[#C81E1E]"
                  aria-label="Remove metric"
                  @click="emit('remove-custom-metric', row.removeId)"
                >
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </li>
              <li v-if="visibleMetricRows.length === 0" class="px-2.5 py-4 text-center text-[11px] text-[#7A7A7A]">
                No custom metrics yet.
              </li>
            </ul>
          </template>
        </div>
      </section>
    </div>

    <OutputExpressionEditorModal
      :open="expressionModal !== null"
      :mode="expressionModal?.mode ?? 'derived-field'"
      :field-options="fieldCandidates"
      :editing="expressionModal?.editing ?? null"
      @cancel="expressionModal = null"
      @save-derived-field="onSaveDerivedField"
      @save-custom-metric="onSaveCustomMetric"
    />
    <HierarchyFieldModal
      :open="hierarchyModalOpen"
      :field-options="fieldCandidates"
      @cancel="hierarchyModalOpen = false"
      @save="onSaveHierarchyField"
    />
    <BulkFieldCapabilitiesModal
      :open="bulkCapabilitiesOpen"
      :rows="fieldRows"
      @cancel="bulkCapabilitiesOpen = false"
      @save="onSaveBulkCapabilities"
    />
  </div>
</template>
