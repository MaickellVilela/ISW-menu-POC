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
          @open-filter-shortcut="openFilterShortcut"
          @configure="onWorkspaceSection('settings')"
        />
      </section>

      <aside
        class="w-[300px] flex-shrink-0 bg-white lg:w-[340px]"
        :aria-label="selectedTable ? 'Entity details' : 'Source browser'"
      >
        <EntityInspectorPanel
          v-if="selectedTable"
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
import SourcePanel from '~/components/datasource/SourcePanel.vue';
import type { CanvasNode, TableRebindPatch } from '~/composables/useDataSourceCanvas';

const route = useRoute();
const router = useRouter();

const usedTableIdentities = ref<string[]>([]);
const selectedTable = ref<CanvasNode | null>(null);
const catalogFocusId = ref('');
const canvasRef = ref<{
  clearTableSelection: () => void;
  replaceTable: (id: string, patch: TableRebindPatch) => void;
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
