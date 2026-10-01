import { buildPreset, type JoinSpec, type PresetSpec, type TableSpec } from './demoPresets';
import type { DataSourceSetup } from './useDataSourceFlow';
import { computeLayout, type CanvasNode, type JoinType, type SourceItem } from './useDataSourceCanvas';

/**
 * Starting canvases for workspace sources. Built once when a source enters the
 * workspace; the workspace keeps each source's nodes from then on.
 */

/** Re-flows nodes into the canvas's tidy layout (specs leave positions at 0). */
export function withComputedLayout(nodes: CanvasNode[]): CanvasNode[] {
  const positions = computeLayout(nodes);
  return nodes.map((node) => {
    const point = positions.get(node.id);
    return point ? { ...node, x: point.x, y: point.y } : node;
  });
}

function table(alias: string, connectionId?: string, item?: SourceItem): TableSpec {
  return { alias, x: 0, y: 0, connectionId, item };
}

function join(
  alias: string,
  left: string,
  right: string,
  on: Array<[string, string]>,
  joinType?: JoinType,
): JoinSpec {
  return { alias, left, right, on, joinType, x: 0, y: 0 };
}

function spec(tables: TableSpec[], joins: JoinSpec[], output: string): PresetSpec {
  return { tables, joins, output, outputPosition: { x: 0, y: 0 } };
}

/**
 * Keyed by demo asset id (`seed-*`) or inventory id (`inv-*`). Campaign sources
 * use the BigQuery analytics tables — the closest campaign model in the catalog.
 */
const SEED_SPECS: Record<string, PresetSpec> = {
  'seed-order-items': spec(
    [table('order_items'), table('orders')],
    [join('j1', 'order_items', 'orders', [['Order Items.order_id', 'Orders.id']])],
    'j1',
  ),
  'seed-campaign-costs': spec(
    [table('ga_sessions', 'bigquery'), table('ga_campaigns', 'bigquery'), table('ga_events', 'bigquery')],
    [
      join('j1', 'ga_sessions', 'ga_campaigns', [['GA Sessions.campaign_id', 'GA Campaigns.id']]),
      join('j2', 'j1', 'ga_events', [['GA Sessions.user_id', 'GA Events.user_id']], 'left'),
    ],
    'j2',
  ),
  'inv-claim-nulls': spec([table('encounters', 'kipu')], [], 'encounters'),
  'inv-store-network': spec(
    [table('stores'), table('regions')],
    [join('j1', 'stores', 'regions', [['Stores.region_id', 'Regions.id']], 'left')],
    'j1',
  ),
  'inv-campaign-cost': spec(
    [table('ga_sessions', 'bigquery'), table('ga_campaigns', 'bigquery'), table('ga_users', 'bigquery')],
    [
      join('j1', 'ga_sessions', 'ga_campaigns', [['GA Sessions.campaign_id', 'GA Campaigns.id']]),
      join('j2', 'j1', 'ga_users', [['GA Sessions.user_id', 'GA Users.id']]),
    ],
    'j2',
  ),
  'inv-ml-model': spec([table('predictions', 'python')], [], 'predictions'),
};

/** Canvas for a demo or inventory source; empty when there is no known model. */
export function canvasNodesForSeed(key: string): CanvasNode[] {
  const preset = SEED_SPECS[key];
  return preset ? withComputedLayout(buildPreset(preset)) : [];
}

/* ------------------------------ wizard setups ----------------------------- */

/** The wizard's `public` tables live on the managed connection, except this one. */
const MARKETING_CAMPAIGNS: SourceItem = {
  key: 'marketing_campaigns',
  label: 'Marketing Campaigns',
  description: 'Campaigns by target segment',
  fields: [
    { name: 'id', type: 'Number' },
    { name: 'name', type: 'Attribute' },
    { name: 'target_segment', type: 'Attribute' },
    { name: 'channel', type: 'Attribute' },
    { name: 'budget', type: 'Number' },
    { name: 'start_date', type: 'Time' },
  ],
};

const OFF_CATALOG_TABLES: Record<string, SourceItem> = {
  marketing_campaigns: MARKETING_CAMPAIGNS,
};

/** Known relations between wizard tables: [table, "Label.field", table, "Label.field"]. */
const SETUP_RELATIONS: Array<[string, string, string, string]> = [
  ['order_items', 'Order Items.order_id', 'orders', 'Orders.id'],
  ['order_items', 'Order Items.product_id', 'products', 'Products.id'],
  ['orders', 'Orders.customer_id', 'customers', 'Customers.id'],
  ['customers', 'Customers.segment', 'marketing_campaigns', 'Marketing Campaigns.target_segment'],
];

/** Match pair for joining `next` onto a chain holding `joined`, chain side first. */
function relationOnto(joined: Set<string>, next: string): [string, string] | null {
  for (const [a, aField, b, bField] of SETUP_RELATIONS) {
    if (b === next && joined.has(a)) return [aField, bField];
    if (a === next && joined.has(b)) return [bField, aField];
  }
  return null;
}

/** Chains the picked tables through their known relations; unrelated tables stay unjoined. */
export function canvasNodesForSetup(setup: DataSourceSetup): CanvasNode[] {
  const [first, ...rest] = setup.tableConfig.tables;
  if (!first) return [];

  const tables = setup.tableConfig.tables.map((key) => table(key, undefined, OFF_CATALOG_TABLES[key]));
  const joins: JoinSpec[] = [];
  const joined = new Set([first]);
  let chain = first;
  let pending = rest;

  // Repeat until a pass adds nothing, so pick order doesn't hide a relation.
  let progressed = true;
  while (progressed && pending.length) {
    progressed = false;
    for (const key of pending) {
      const on = relationOnto(joined, key);
      if (!on) continue;
      const alias = `j${joins.length + 1}`;
      joins.push(join(alias, chain, key, [on]));
      joined.add(key);
      chain = alias;
      progressed = true;
    }
    pending = pending.filter((key) => !joined.has(key));
  }

  return withComputedLayout(buildPreset(spec(tables, joins, chain)));
}
