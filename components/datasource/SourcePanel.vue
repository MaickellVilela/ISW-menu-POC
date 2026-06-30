<script setup lang="ts">
import { SOURCE_DRAG_MIME, type SourceItem } from '~/composables/useDataSourceCanvas';

const items: SourceItem[] = [
  {
    key: 'transactions',
    label: 'Transactions',
    description: 'Sales transactions',
    fields: ['id', 'location_id', 'customer_id', 'amount', 'created_at'],
  },
  {
    key: 'items',
    label: 'Items',
    description: 'Line items per transaction',
    fields: ['id', 'transaction_id', 'product_id', 'quantity', 'price'],
  },
  {
    key: 'products',
    label: 'Products',
    description: 'Product catalog',
    fields: ['id', 'name', 'category', 'unit_price'],
  },
  {
    key: 'locations',
    label: 'Locations',
    description: 'Store locations',
    fields: ['id', 'name', 'region', 'country'],
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Customer master records',
    fields: ['id', 'name', 'email', 'segment'],
  },
];

function onDragStart(event: DragEvent, item: SourceItem): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(SOURCE_DRAG_MIME, JSON.stringify(item));
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="px-4 py-3 border-b border-[#D8D8D8]">
      <h2 class="text-sm font-semibold text-[#25262E]">Data Sources</h2>
      <p class="mt-0.5 text-xs text-[#6B6B6B]">Drag a table onto the canvas</p>
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
