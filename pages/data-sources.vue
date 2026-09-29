<template>
  <div class="flex h-full flex-col overflow-hidden">
    <DataSourceWorkspaceHeader
      :section="section"
    />

    <div
      v-show="section === 'canvas'"
      class="flex min-h-0 flex-1 overflow-hidden"
    >
      <section
        class="min-w-0 flex-1 border-r border-[#D8D8D8] bg-white"
        aria-label="Canvas"
      >
        <DataSourceCanvas
          ref="canvasRef"
          @update:used-table-identities="usedTableIdentities = $event"
          @update:selected-table="selectedTable = $event"
          @update:selected-output="selectedOutput = $event"
          @update:canvas-nodes="canvasNodes = $event"
          @open-filter-shortcut="openFilterShortcut"
          @configure="onWorkspaceSection('settings')"
        />
      </section>

      <aside
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

    <DataSourceSettingsPanel
      v-if="section === 'settings'"
      class="min-h-0 flex-1"
      :active-section="settingsSection"
      :shortcut="filterShortcut"
      @go-to-canvas="closeConfigure"
      @update:active-section="onSettingsSection"
      @shortcut-consumed="consumeFilterShortcut"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  configureQueryForShortcut,
  parseSettingsSection,
  queryWithoutFilterIntent,
  shortcutFromConfigureQuery,
  type CanvasFilterShortcut,
  type DataSourceSettingsSection,
} from '~/composables/canvasFilterShortcuts';
import DataSourceCanvas from '~/components/datasource/DataSourceCanvas.vue';
import DataSourceSettingsPanel from '~/components/datasource/DataSourceSettingsPanel.vue';
import DataSourceWorkspaceHeader from '~/components/datasource/DataSourceWorkspaceHeader.vue';
import EntityInspectorPanel from '~/components/datasource/EntityInspectorPanel.vue';
import OutputInspectorPanel from '~/components/datasource/OutputInspectorPanel.vue';
import SourcePanel from '~/components/datasource/SourcePanel.vue';
import type {
  CanvasNode,
  FieldCapabilities,
  OutputTranslationFile,
  TableRebindPatch,
} from '~/composables/useDataSourceCanvas';

const route = useRoute();
const router = useRouter();

const usedTableIdentities = ref<string[]>([]);
const selectedTable = ref<CanvasNode | null>(null);
const selectedOutput = ref<CanvasNode | null>(null);
const canvasNodes = ref<CanvasNode[]>([]);
const catalogFocusId = ref('');
const canvasRef = ref<{
  clearTableSelection: () => void;
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
const filterShortcut = computed(() => shortcutFromConfigureQuery(route.query));

const settingsSection = computed(() => parseSettingsSection(route.query.configure) ?? 'time-bar');
const section = computed<'canvas' | 'settings'>(() =>
  parseSettingsSection(route.query.configure) ? 'settings' : 'canvas',
);

function setConfigureQuery(configure?: DataSourceSettingsSection, field?: string): void {
  if (!configure) {
    router.replace({ query: {} });
    return;
  }
  const query: Record<string, string> = { configure };
  if (field) query.field = field;
  router.replace({ query });
}

function openFilterShortcut(shortcut: CanvasFilterShortcut): void {
  router.replace({ query: configureQueryForShortcut(shortcut) });
}

function closeConfigure(): void {
  setConfigureQuery();
}

function consumeFilterShortcut(): void {
  if (!filterShortcut.value) return;
  router.replace({ query: queryWithoutFilterIntent(route.query) });
}

function onWorkspaceSection(next: 'canvas' | 'settings'): void {
  if (next === 'canvas') closeConfigure();
  else setConfigureQuery('time-bar');
}

function onSettingsSection(next: DataSourceSettingsSection): void {
  setConfigureQuery(next);
}
</script>
