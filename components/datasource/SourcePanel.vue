<script setup lang="ts">
import { SOURCE_DRAG_MIME, type SourceItem } from '~/composables/useDataSourceCanvas';
import { ENTITIES } from '~/composables/dataSourceEntities';

const items = ENTITIES;

function onDragStart(event: DragEvent, item: SourceItem): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(SOURCE_DRAG_MIME, JSON.stringify(item));
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="px-4 py-3 border-b border-[#D8D8D8]">
      <h2 class="text-sm font-semibold text-[#25262E]">Entities</h2>
      <p class="mt-0.5 text-xs text-[#6B6B6B]">Drag an entity onto the canvas</p>
    </header>

    <ul class="flex-1 overflow-y-auto p-3 space-y-2">
      <li
        v-for="item in items"
        :key="item.key"
        draggable="true"
        class="group flex items-start gap-3 px-3 py-2.5 rounded-md border border-[#E2E2E2] bg-white cursor-grab active:cursor-grabbing hover:border-[#3B1770] hover:shadow-sm transition-colors"
        @dragstart="onDragStart($event, item)"
      >
        <span class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[#F1ECFA] text-[#3B1770]">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18M3 14h18M9 4v16" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-medium text-[#25262E] truncate">{{ item.label }}</span>
          <span class="block text-xs text-[#6B6B6B] truncate">{{ item.description }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>
