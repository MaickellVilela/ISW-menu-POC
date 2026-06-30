<template>
  <div class="flex h-full overflow-hidden">
    <section
      class="w-[80%] bg-white border-r border-[#D8D8D8]"
      aria-label="Canvas"
    >
      <DataSourceCanvas />
    </section>

    <aside
      class="w-[20%] bg-white"
      aria-label="Details sidebar"
    >
      <SourcePanel />
    </aside>
  </div>
</template>

<script setup lang="ts">
import DataSourceCanvas from '~/components/datasource/DataSourceCanvas.vue';
import SourcePanel from '~/components/datasource/SourcePanel.vue';
</script>
