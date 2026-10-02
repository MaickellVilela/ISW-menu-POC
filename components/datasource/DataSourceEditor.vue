<template>
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <section
      class="min-w-0 flex-1 bg-white"
      :class="{ 'border-r border-[#D8D8D8]': showSidePanel }"
      aria-label="Canvas"
    >
      <DataSourceCanvas
        ref="canvasRef"
        :storage-key="storageKey"
        :initial-nodes="initialNodes"
        :show-settings="showSettings"
        :show-demo="showDemo"
        :show-save="showSave"
        :highlight="highlight"
        @update:used-table-identities="usedTableIdentities = $event"
        @update:selected-table="selectedTable = $event"
        @update:selected-output="selectedOutput = $event"
        @update:canvas-nodes="onCanvasNodes"
        @open-filter-shortcut="emit('open-filter-shortcut', $event)"
        @configure="emit('configure')"
        @save="emit('save')"
      />
    </section>

    <aside
      v-if="showSidePanel"
      class="w-[300px] flex-shrink-0 bg-white lg:w-[340px]"
      :aria-label="selectedOutput ? 'Output details' : selectedTable ? 'Entity details' : 'Source browser'"
    >
      <OutputInspectorPanel
        v-if="selectedOutput"
        :node="selectedOutput"
        :all-nodes="canvasNodes"
        @close="closeInspector"
        @add-derived-field="({ name, expression }) => canvasRef?.addDerivedField(name, expression)"
        @update-derived-field="({ id, name, expression }) => canvasRef?.updateDerivedField(id, name, expression)"
        @remove-derived-field="(id) => canvasRef?.removeDerivedField(id)"
        @add-hierarchy-field="({ label, parentField, childField, labelField }) => canvasRef?.addHierarchyField(label, parentField, childField, labelField)"
        @remove-hierarchy-field="(id) => canvasRef?.removeHierarchyField(id)"
        @add-custom-metric="({ name, expression }) => canvasRef?.addCustomMetric(name, expression)"
        @update-custom-metric="({ id, name, expression }) => canvasRef?.updateCustomMetric(id, name, expression)"
        @remove-custom-metric="(id) => canvasRef?.removeCustomMetric(id)"
        @set-field-label="({ key, label }) => canvasRef?.setFieldLabel(key, label)"
        @set-bulk-field-capabilities="(patch) => canvasRef?.setBulkFieldCapabilities(patch)"
        @set-translation-file="(file) => canvasRef?.setOutputTranslationFile(file)"
      />
      <EntityInspectorPanel
        v-else-if="selectedTable"
        :node="selectedTable"
        @close="closeInspector"
        @apply="applyEntityDetails"
        @view-catalog="viewEntityCatalog"
      />
      <SourcePanel
        v-else
        :used-table-identities="usedTableIdentities"
        :selected-source-id="catalogFocusId"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { CanvasFilterShortcut } from '~/composables/canvasFilterShortcuts';
import DataSourceCanvas from '~/components/datasource/DataSourceCanvas.vue';
import EntityInspectorPanel from '~/components/datasource/EntityInspectorPanel.vue';
import OutputInspectorPanel from '~/components/datasource/OutputInspectorPanel.vue';
import SourcePanel from '~/components/datasource/SourcePanel.vue';
import type {
  CanvasHighlight,
  CanvasNode,
  FieldCapabilities,
  OutputTranslationFile,
  TableRebindPatch,
} from '~/composables/useDataSourceCanvas';

/**
 * Canvas plus its side panel (source browser, entity and output inspectors).
 * Shared by the standalone data source page and the workspace.
 */
withDefaults(
  defineProps<{
    storageKey?: string | null;
    initialNodes?: CanvasNode[];
    showSettings?: boolean;
    showDemo?: boolean;
    showSave?: boolean;
    showSidePanel?: boolean;
    highlight?: CanvasHighlight | null;
  }>(),
  {
    storageKey: undefined,
    initialNodes: undefined,
    highlight: null,
    showSettings: true,
    showDemo: true,
    showSave: true,
    showSidePanel: true,
  },
);

const emit = defineEmits<{
  'open-filter-shortcut': [shortcut: CanvasFilterShortcut];
  configure: [];
  save: [];
  'update:canvasNodes': [nodes: CanvasNode[]];
}>();

const usedTableIdentities = ref<string[]>([]);
const selectedTable = ref<CanvasNode | null>(null);
const selectedOutput = ref<CanvasNode | null>(null);
const canvasNodes = ref<CanvasNode[]>([]);
const catalogFocusId = ref('');
const canvasRef = ref<{
  clearTableSelection: () => void;
  saveSource: () => void;
  replaceTable: (id: string, patch: TableRebindPatch) => void;
  addDerivedField: (name: string, expression: string) => void;
  updateDerivedField: (id: string, name: string, expression: string) => void;
  removeDerivedField: (id: string) => void;
  addHierarchyField: (label: string, parentField: string, childField: string, labelField?: string) => void;
  removeHierarchyField: (id: string) => void;
  addCustomMetric: (name: string, expression: string) => void;
  updateCustomMetric: (id: string, name: string, expression: string) => void;
  removeCustomMetric: (id: string) => void;
  setFieldLabel: (key: string, label: string) => void;
  setBulkFieldCapabilities: (patch: Record<string, FieldCapabilities>) => void;
  setOutputTranslationFile: (file: OutputTranslationFile | undefined) => void;
} | null>(null);

function onCanvasNodes(nodes: CanvasNode[]): void {
  canvasNodes.value = nodes;
  emit('update:canvasNodes', nodes);
}

function closeInspector(): void {
  catalogFocusId.value = '';
  canvasRef.value?.clearTableSelection();
}

function applyEntityDetails(patch: TableRebindPatch): void {
  if (!selectedTable.value) return;
  canvasRef.value?.replaceTable(selectedTable.value.id, patch);
}

function viewEntityCatalog(sourceId: string): void {
  catalogFocusId.value = sourceId;
  canvasRef.value?.clearTableSelection();
}

/** Validates joins like the canvas Save button; emits `save` only when valid. */
function saveSource(): void {
  canvasRef.value?.saveSource();
}

defineExpose({ saveSource });
</script>
