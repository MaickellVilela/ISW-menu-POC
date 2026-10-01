<template>
  <div class="flex h-full flex-col overflow-hidden">
    <DataSourceWorkspaceHeader
      :section="section"
    />

    <DataSourceEditor
      v-show="section === 'canvas'"
      @open-filter-shortcut="openFilterShortcut"
      @configure="onWorkspaceSection('settings')"
    />

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
import { computed } from 'vue';
import {
  configureQueryForShortcut,
  parseSettingsSection,
  queryWithoutFilterIntent,
  shortcutFromConfigureQuery,
  type CanvasFilterShortcut,
  type DataSourceSettingsSection,
} from '~/composables/canvasFilterShortcuts';
import DataSourceEditor from '~/components/datasource/DataSourceEditor.vue';
import DataSourceSettingsPanel from '~/components/datasource/DataSourceSettingsPanel.vue';
import DataSourceWorkspaceHeader from '~/components/datasource/DataSourceWorkspaceHeader.vue';

const route = useRoute();
const router = useRouter();

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
