import type { ConnectorKey } from './connectorIcons';
import { ENTITIES, entityByKey } from './dataSourceEntities';
import type { FieldDef, SourceItem } from './useDataSourceCanvas';

export interface DataSourceConnection {
  id: string;
  name: string;
  connector: ConnectorKey;
  entityKeys: string[];
}

export interface DataSourceFile {
  id: string;
  name: string;
  kind: 'CSV' | 'Excel' | 'JSON' | 'File';
  sourceItem: SourceItem;
}

const ENTITY_SETS = {
  all: ENTITIES.map((entity) => entity.key),
  commerce: ['orders', 'order_items', 'customers', 'products'],
  customers: ['customers', 'orders', 'regions'],
  inventory: ['products', 'categories', 'suppliers'],
  locations: ['stores', 'regions', 'employees'],
} as const;

export const DATA_SOURCE_CONNECTIONS: DataSourceConnection[] = [
  { id: 'managed', name: 'Managed', connector: 'postgresql', entityKeys: [...ENTITY_SETS.all] },
  { id: 'redshift', name: 'Redshift', connector: 'redshift', entityKeys: [...ENTITY_SETS.commerce] },
  { id: 'snowflake-logi', name: 'Snowflake - Logi', connector: 'snowflake', entityKeys: [...ENTITY_SETS.inventory] },
  { id: 'snowflake-peter', name: 'Snowflake - Peter Test', connector: 'snowflake', entityKeys: [...ENTITY_SETS.customers] },
  { id: 'fivision', name: 'fiVISION', connector: 's3', entityKeys: [...ENTITY_SETS.locations] },
  { id: 'postgresql', name: 'PostgreSQL', connector: 'postgresql', entityKeys: [...ENTITY_SETS.all] },
  { id: 'parsable', name: 'Parsable', connector: 'mongodb', entityKeys: [...ENTITY_SETS.commerce] },
  { id: 'managed-peter', name: 'Managed - Peter', connector: 'postgresql', entityKeys: [...ENTITY_SETS.customers] },
  { id: 'impala', name: 'Impala', connector: 'impala', entityKeys: [...ENTITY_SETS.inventory] },
  { id: 'bigquery', name: 'BigQuery', connector: 'bigquery', entityKeys: [...ENTITY_SETS.all] },
  { id: 'elasticsearch', name: 'Elasticsearch 7.0', connector: 'elasticsearch', entityKeys: [...ENTITY_SETS.customers] },
  { id: 'postgresql-ses', name: "PostgreSQL | SE's", connector: 'postgresql', entityKeys: [...ENTITY_SETS.locations] },
  { id: 'kipu', name: 'Kipu', connector: 'elasticsearch', entityKeys: [...ENTITY_SETS.commerce] },
  { id: 'redshift-snapshot', name: 'Redshift (2025-11-25T12:54…', connector: 'redshift', entityKeys: [...ENTITY_SETS.inventory] },
  { id: 'isw-snowflake', name: 'ISW Snowflake - SFDC', connector: 'snowflake', entityKeys: [...ENTITY_SETS.customers] },
  { id: 'python-nested', name: 'Python Nested JSON', connector: 'python', entityKeys: [...ENTITY_SETS.commerce] },
  { id: 'flight-schedule', name: 'Flight Schedule Pro', connector: 'bigquery', entityKeys: [...ENTITY_SETS.locations] },
  { id: 'learning-management', name: 'Learning Management Data', connector: 'hive', entityKeys: [...ENTITY_SETS.customers] },
  { id: 'python', name: 'Python', connector: 'python', entityKeys: [...ENTITY_SETS.all] },
  { id: 'petertest', name: 'PeterTest', connector: 'postgresql', entityKeys: [...ENTITY_SETS.inventory] },
  { id: 'adventureworks', name: 'AdventureWorks', connector: 'postgresql', entityKeys: [...ENTITY_SETS.commerce] },
  { id: 'adventureworkspgr', name: 'AdventureWorksPGR', connector: 'postgresql', entityKeys: [...ENTITY_SETS.all] },
  { id: 'water-data', name: 'Water Data', connector: 'mongodb', entityKeys: [...ENTITY_SETS.locations] },
];

function cloneFields(fields: FieldDef[]): FieldDef[] {
  return fields.map((field) => ({ ...field }));
}

function sourceItemFromEntity(key: string): SourceItem | null {
  const entity = entityByKey(key);
  if (!entity) return null;
  return { ...entity, fields: cloneFields(entity.fields) };
}

export function entitiesForConnection(connection: DataSourceConnection): SourceItem[] {
  return connection.entityKeys.flatMap((key) => {
    const entity = sourceItemFromEntity(key);
    return entity ? [entity] : [];
  });
}

export function filterConnections(
  connections: DataSourceConnection[],
  query: string,
): DataSourceConnection[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return connections;
  return connections.filter((connection) =>
    `${connection.name} ${connection.connector}`.toLowerCase().includes(needle),
  );
}

export function filterSourceItems(items: SourceItem[], query: string): SourceItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    `${item.label} ${item.description} ${item.fields.map((field) => field.name).join(' ')}`
      .toLowerCase()
      .includes(needle),
  );
}

function fileKind(name: string): DataSourceFile['kind'] {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') return 'CSV';
  if (extension === 'xls' || extension === 'xlsx') return 'Excel';
  if (extension === 'json') return 'JSON';
  return 'File';
}

function fileLabel(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

const GENERIC_FILE_FIELDS: FieldDef[] = [
  { name: 'id', type: 'Number' },
  { name: 'name', type: 'Attribute' },
  { name: 'value', type: 'Number' },
  { name: 'created_at', type: 'Time' },
];

export function createDataSourceFile(id: string, name: string, fields: FieldDef[] = GENERIC_FILE_FIELDS): DataSourceFile {
  const label = fileLabel(name);
  return {
    id,
    name,
    kind: fileKind(name),
    sourceItem: {
      key: `file-${id}`,
      label,
      description: `${fileKind(name)} file`,
      fields: cloneFields(fields),
    },
  };
}

export const DATA_SOURCE_FILES: DataSourceFile[] = [
  createDataSourceFile('orders-csv', 'Orders Data - CSV.csv', entityByKey('orders')?.fields),
  createDataSourceFile('sales-country', 'Sales by Country.xlsx', entityByKey('regions')?.fields),
  createDataSourceFile('online-tour', 'Online Tour Bookings.csv'),
  createDataSourceFile('online-tour-2', 'Online Tour Bookings 2.csv'),
  createDataSourceFile('online-tours', 'Online Tours.csv'),
  createDataSourceFile('gcp-isw', 'GCP_ISW.json'),
  createDataSourceFile('isw-products', 'ISW_Accts_Products.csv', entityByKey('products')?.fields),
  createDataSourceFile('test-file', 'Test File.csv'),
  createDataSourceFile('gcp1', 'GCp1.json'),
  createDataSourceFile('isw2', 'ISW2.csv'),
  createDataSourceFile('adventureworks-upload', 'Upload for AdventureWorks.csv'),
];
