import type { SourceItem } from './useDataSourceCanvas';

/**
 * Shared entity catalog for the data-source canvas.
 *
 * The schema is intentionally designed so relationships are *inferable* by
 * convention: a foreign key named `<entity>_id` matches the `id` of that
 * entity's table (e.g. Orders.customer_id -> Customers.id). Both the source
 * panel and the demo presets build from this single source of truth.
 */
export const ENTITIES: SourceItem[] = [
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

/** Look up an entity definition by its catalog key. */
export function entityByKey(key: string): SourceItem | undefined {
  return ENTITIES.find((entity) => entity.key === key);
}
