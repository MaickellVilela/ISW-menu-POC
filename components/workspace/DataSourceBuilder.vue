<script setup lang="ts">
import DataSourceCanvas from '~/components/datasource/DataSourceCanvas.vue';
import SourcePanel from '~/components/datasource/SourcePanel.vue';

withDefaults(
  defineProps<{
    /** Show the draggable entity panel. Hidden when used as a read-only preview. */
    showSourcePanel?: boolean;
  }>(),
  { showSourcePanel: true },
);
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <section
      class="bg-white"
      :class="showSourcePanel ? 'w-[80%] border-r border-[#D8D8D8]' : 'w-full'"
      aria-label="Canvas"
    >
      <DataSourceCanvas />
    </section>

    <aside v-if="showSourcePanel" class="w-[20%] bg-white" aria-label="Details sidebar">
      <SourcePanel />
    </aside>
  </div>
</template>
