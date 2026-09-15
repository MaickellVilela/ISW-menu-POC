import {
  createId,
  createOutputNode,
  createTableNode,
  type CanvasNode,
  type JoinCondition,
  type JoinType,
} from './useDataSourceCanvas';
import { entityByKey } from './dataSourceEntities';
import { entityCatalogSelectionId } from './dataSourceCatalog';

const DEMO_CONNECTION_ID = 'managed';

/* -------------------------------------------------------------------------- */
/* Declarative preset specs                                                   */
/*                                                                            */
/* Specs are plain data so they are trivial to read and unit test. A builder  */
/* turns a spec into concrete CanvasNode[] (assigning real ids + wiring the    */
/* output). Field references use the "Entity Label.field" form the canvas     */
/* already stores in join conditions.                                         */
/* -------------------------------------------------------------------------- */

interface TableSpec {
  /** Local alias, also the entity catalog key. */
  alias: string;
  x: number;
  y: number;
}

interface JoinSpec {
  /** Local alias used to reference this join as a downstream input. */
  alias: string;
  /** Alias of the left input (a table or another join). */
  left: string;
  /** Alias of the right input (a table or another join). */
  right: string;
  /** Match pairs as ["Left Label.field", "Right Label.field"]. */
  on: Array<[string, string]>;
  joinType?: JoinType;
  x: number;
  y: number;
}

interface PresetSpec {
  tables: TableSpec[];
  joins: JoinSpec[];
  /** Alias of the node feeding the Output. */
  output: string;
  outputPosition: { x: number; y: number };
}

export interface DemoPreset {
  id: string;
  name: string;
  description: string;
  build: () => CanvasNode[];
}

/** Turns a declarative spec into concrete canvas nodes (pure, deterministic shape). */
export function buildPreset(spec: PresetSpec): CanvasNode[] {
  const nodes: CanvasNode[] = [];
  const idByAlias = new Map<string, string>();

  for (const table of spec.tables) {
    const entity = entityByKey(table.alias);
    if (!entity) continue;
    const node = createTableNode(
      entity,
      table.x,
      table.y,
      entityCatalogSelectionId(DEMO_CONNECTION_ID, table.alias),
    );
    idByAlias.set(table.alias, node.id);
    nodes.push(node);
  }

  for (const join of spec.joins) {
    const leftId = idByAlias.get(join.left);
    const rightId = idByAlias.get(join.right);
    if (!leftId || !rightId) continue;

    const conditions: JoinCondition[] = join.on.map(([leftField, rightField]) => ({
      id: createId('cond'),
      leftField,
      rightField,
    }));

    const node: CanvasNode = {
      id: createId('join'),
      type: 'join',
      label: 'Join',
      x: join.x,
      y: join.y,
      inputs: [leftId, rightId],
      joinType: join.joinType ?? 'inner',
      conditions,
    };
    idByAlias.set(join.alias, node.id);
    nodes.push(node);
  }

  const output = createOutputNode(spec.outputPosition.x, spec.outputPosition.y);
  const sourceId = idByAlias.get(spec.output);
  output.inputs = sourceId ? [sourceId] : [];
  nodes.push(output);

  return nodes;
}

/* ------------------------------ preset specs ------------------------------ */

/** Minimum: two entities, one join. */
const STARTER_SPEC: PresetSpec = {
  tables: [
    { alias: 'orders', x: 120, y: 160 },
    { alias: 'customers', x: 120, y: 400 },
  ],
  joins: [
    {
      alias: 'j1',
      left: 'orders',
      right: 'customers',
      on: [['Orders.customer_id', 'Customers.id']],
      x: 500,
      y: 270,
    },
  ],
  output: 'j1',
  outputPosition: { x: 880, y: 290 },
};

/** Average: a handful of entities with joins that feed other joins. */
const LAYERED_SPEC: PresetSpec = {
  tables: [
    { alias: 'order_items', x: 100, y: 80 },
    { alias: 'orders', x: 100, y: 320 },
    { alias: 'products', x: 100, y: 560 },
    { alias: 'customers', x: 100, y: 800 },
  ],
  joins: [
    {
      alias: 'items_orders',
      left: 'order_items',
      right: 'orders',
      on: [['Order Items.order_id', 'Orders.id']],
      x: 460,
      y: 180,
    },
    {
      alias: 'with_products',
      left: 'items_orders',
      right: 'products',
      on: [['Order Items.product_id', 'Products.id']],
      x: 800,
      y: 340,
    },
    {
      alias: 'with_customers',
      left: 'with_products',
      right: 'customers',
      on: [['Orders.customer_id', 'Customers.id']],
      joinType: 'left',
      x: 1140,
      y: 500,
    },
  ],
  output: 'with_customers',
  outputPosition: { x: 1500, y: 520 },
};

/** Stress test: every entity chained into a single output pipeline. */
const FULL_MODEL_SPEC: PresetSpec = {
  tables: [
    { alias: 'order_items', x: 80, y: 40 },
    { alias: 'orders', x: 80, y: 220 },
    { alias: 'products', x: 80, y: 400 },
    { alias: 'categories', x: 80, y: 580 },
    { alias: 'suppliers', x: 80, y: 760 },
    { alias: 'customers', x: 80, y: 940 },
    { alias: 'stores', x: 80, y: 1120 },
    { alias: 'regions', x: 80, y: 1300 },
    { alias: 'employees', x: 80, y: 1480 },
  ],
  joins: [
    {
      alias: 'j1',
      left: 'order_items',
      right: 'orders',
      on: [['Order Items.order_id', 'Orders.id']],
      x: 380,
      y: 120,
    },
    {
      alias: 'j2',
      left: 'j1',
      right: 'products',
      on: [['Order Items.product_id', 'Products.id']],
      x: 640,
      y: 220,
    },
    {
      alias: 'j3',
      left: 'j2',
      right: 'categories',
      on: [['Products.category_id', 'Categories.id']],
      x: 900,
      y: 320,
    },
    {
      alias: 'j4',
      left: 'j3',
      right: 'suppliers',
      on: [['Products.supplier_id', 'Suppliers.id']],
      x: 1160,
      y: 420,
    },
    {
      alias: 'j5',
      left: 'j4',
      right: 'customers',
      on: [['Orders.customer_id', 'Customers.id']],
      x: 1420,
      y: 520,
    },
    {
      alias: 'j6',
      left: 'j5',
      right: 'stores',
      on: [['Orders.store_id', 'Stores.id']],
      x: 1680,
      y: 620,
    },
    {
      alias: 'j7',
      left: 'j6',
      right: 'regions',
      on: [['Stores.region_id', 'Regions.id']],
      joinType: 'left',
      x: 1940,
      y: 720,
    },
    {
      alias: 'j8',
      left: 'j7',
      right: 'employees',
      on: [['Stores.id', 'Employees.store_id']],
      joinType: 'left',
      x: 2200,
      y: 820,
    },
  ],
  output: 'j8',
  outputPosition: { x: 2560, y: 840 },
};

/** Demo presets exposed to the UI, ordered from simplest to most complex. */
export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Two entities, one join',
    build: () => buildPreset(STARTER_SPEC),
  },
  {
    id: 'layered',
    name: 'Layered',
    description: 'Joins feeding into joins',
    build: () => buildPreset(LAYERED_SPEC),
  },
  {
    id: 'full-model',
    name: 'Full Model',
    description: 'Every entity in one pipeline',
    build: () => buildPreset(FULL_MODEL_SPEC),
  },
];
