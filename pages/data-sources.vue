<template>
  <div class="flex h-full flex-col overflow-hidden">
    <DataSourceWorkspaceHeader
      :section="section"
      @update:section="section = $event"
    />

    <div
      v-show="section === 'canvas'"
      class="flex min-h-0 flex-1 overflow-hidden"
    >
      <section
        class="min-w-0 flex-1 border-r border-[#D8D8D8] bg-white"
        aria-label="Canvas"
      >
        <DataSourceCanvas />
      </section>

      <aside
        class="w-[280px] flex-shrink-0 bg-white lg:w-[320px]"
        aria-label="Source browser"
      >
        <SourcePanel />
      </aside>
    </div>

    <DataSourceSettingsPanel
      v-if="section === 'settings'"
      class="min-h-0 flex-1"
      @go-to-canvas="section = 'canvas'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DataSourceCanvas from '~/components/datasource/DataSourceCanvas.vue';
import DataSourceSettingsPanel from '~/components/datasource/DataSourceSettingsPanel.vue';
import DataSourceWorkspaceHeader from '~/components/datasource/DataSourceWorkspaceHeader.vue';
import SourcePanel from '~/components/datasource/SourcePanel.vue';

const section = ref<'canvas' | 'settings'>('canvas');
</script>
