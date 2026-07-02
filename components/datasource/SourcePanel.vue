<script setup lang="ts">
import { SOURCE_DRAG_MIME, type SourceItem } from '~/composables/useDataSourceCanvas';

// Sample schema designed so relationships are *inferable* by convention:
// a foreign key named `<entity>_id` matches the `id` of that entity's table.
// e.g. Orders.customer_id -> Customers.id, Order Items.product_id -> Products.id.
const items: SourceItem[] = [
  {
    key: 'orders',
    label: 'Orders',
    description: 'Customer orders (fact)',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'customer_id', type: 'Number' },
      { name: 'store_id', type: 'Number' },
      { name: 'status', type: 'Attribute' },
      { name: 'total_amount', type: 'Number' },
      { name: 'order_date', type: 'Time' },
    ],
  },
  {
    key: 'order_items',
    label: 'Order Items',
    description: 'Line items per order',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'order_id', type: 'Number' },
      { name: 'product_id', type: 'Number' },
      { name: 'quantity', type: 'Number' },
      { name: 'unit_price', type: 'Number' },
      { name: 'discount', type: 'Number' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Customer master records',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'email', type: 'Attribute' },
      { name: 'segment', type: 'Attribute' },
      { name: 'region_id', type: 'Number' },
      { name: 'created_at', type: 'Time' },
    ],
  },
  {
    key: 'products',
    label: 'Products',
    description: 'Product catalog',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'category_id', type: 'Number' },
      { name: 'supplier_id', type: 'Number' },
      { name: 'brand', type: 'Attribute' },
      { name: 'unit_price', type: 'Number' },
    ],
  },
  {
    key: 'categories',
    label: 'Categories',
    description: 'Product categories',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'department', type: 'Attribute' },
    ],
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    description: 'Product suppliers',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'region_id', type: 'Number' },
      { name: 'country', type: 'Attribute' },
    ],
  },
  {
    key: 'stores',
    label: 'Stores',
    description: 'Physical / online stores',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'region_id', type: 'Number' },
      { name: 'opened_at', type: 'Time' },
    ],
  },
  {
    key: 'regions',
    label: 'Regions',
    description: 'Sales regions',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'country', type: 'Attribute' },
    ],
  },
  {
    key: 'employees',
    label: 'Employees',
    description: 'Store staff',
    fields: [
      { name: 'id', type: 'Number' },
      { name: 'name', type: 'Attribute' },
      { name: 'store_id', type: 'Number' },
      { name: 'role', type: 'Attribute' },
      { name: 'hire_date', type: 'Time' },
    ],
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
