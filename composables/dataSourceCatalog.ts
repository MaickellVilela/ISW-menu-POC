import type { ConnectorKey } from './connectorIcons';
import { connectionEntityKeys, entitiesForConnectionId, entityByKey } from './dataSourceEntities';
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

export type SourceCatalogSelection =
  | {
    kind: 'entity';
    connection: DataSourceConnection;
    sourceItem: SourceItem;
  }
  | {
    kind: 'file';
    file: DataSourceFile;
    sourceItem: SourceItem;
  };

export function entityCatalogSelectionId(connectionId: string, entityKey: string): string {
  return `entity:${connectionId}:${entityKey}`;
}

export function connectionCatalogIdPrefix(connectionId: string): string {
  return `entity:${connectionId}:`;
}

export function fileCatalogSelectionId(fileId: string): string {
  return `file:${fileId}`;
}

export function sourceCatalogSelectionId(selection: SourceCatalogSelection): string {
  return selection.kind === 'entity'
    ? entityCatalogSelectionId(selection.connection.id, selection.sourceItem.key)
    : fileCatalogSelectionId(selection.file.id);
}

function defineConnection(
  id: string,
  name: string,
  connector: ConnectorKey,
): DataSourceConnection {
  return { id, name, connector, entityKeys: connectionEntityKeys(id) };
}

export const DATA_SOURCE_CONNECTIONS: DataSourceConnection[] = [
  defineConnection('managed', 'Managed', 'postgresql'),
  defineConnection('redshift', 'Redshift', 'redshift'),
  defineConnection('snowflake-logi', 'Snowflake - Logi', 'snowflake'),
  defineConnection('snowflake-peter', 'Snowflake - Peter Test', 'snowflake'),
  defineConnection('fivision', 'fiVISION', 's3'),
  defineConnection('postgresql', 'PostgreSQL', 'postgresql'),
  defineConnection('parsable', 'Parsable', 'mongodb'),
  defineConnection('managed-peter', 'Managed - Peter', 'postgresql'),
  defineConnection('impala', 'Impala', 'impala'),
  defineConnection('bigquery', 'BigQuery', 'bigquery'),
  defineConnection('elasticsearch', 'Elasticsearch 7.0', 'elasticsearch'),
  defineConnection('postgresql-ses', "PostgreSQL | SE's", 'postgresql'),
  defineConnection('kipu', 'Kipu', 'elasticsearch'),
  defineConnection('redshift-snapshot', 'Redshift (2025-11-25T12:54…', 'redshift'),
  defineConnection('isw-snowflake', 'ISW Snowflake - SFDC', 'snowflake'),
  defineConnection('python-nested', 'Python Nested JSON', 'python'),
  defineConnection('flight-schedule', 'Flight Schedule Pro', 'bigquery'),
  defineConnection('learning-management', 'Learning Management Data', 'hive'),
  defineConnection('python', 'Python', 'python'),
  defineConnection('petertest', 'PeterTest', 'postgresql'),
  defineConnection('adventureworks', 'AdventureWorks', 'postgresql'),
  defineConnection('adventureworkspgr', 'AdventureWorksPGR', 'postgresql'),
  defineConnection('water-data', 'Water Data', 'mongodb'),
];

function cloneFields(fields: FieldDef[]): FieldDef[] {
  return fields.map((field) => ({ ...field }));
}

function cloneEntity(item: SourceItem): SourceItem {
  return { ...item, fields: cloneFields(item.fields) };
}

export function entitiesForConnection(connection: DataSourceConnection): SourceItem[] {
  const dataset = entitiesForConnectionId(connection.id);
  if (dataset.length > 0) return dataset.map(cloneEntity);

  return connection.entityKeys.flatMap((key) => {
    const entity = entityByKey(key);
    return entity ? [cloneEntity(entity)] : [];
  });
}

export interface ConnectionSearchMatch {
  connection: DataSourceConnection;
  matchingEntities: SourceItem[];
}

function normalizedQuery(query: string): string {
  return query.trim().toLowerCase();
}

function connectionNameMatches(connection: DataSourceConnection, needle: string): boolean {
  return `${connection.name} ${connection.connector}`.toLowerCase().includes(needle);
}

/** Matches a table by key or label — not by description or field names. */
export function entityNameMatches(item: SourceItem, query: string): boolean {
  const needle = normalizedQuery(query);
  if (!needle) return true;
  return `${item.key} ${item.label}`.toLowerCase().includes(needle);
}

export function matchingEntitiesForConnection(
  connection: DataSourceConnection,
  query: string,
): SourceItem[] {
  const needle = normalizedQuery(query);
  if (!needle) return [];
  return entitiesForConnection(connection).filter((entity) => entityNameMatches(entity, query));
}

export function matchingEntityCaption(entities: SourceItem[], limit = 3): string {
  if (entities.length === 0) return '';
  const names = entities.slice(0, limit).map((entity) => entity.label);
  const remaining = entities.length - names.length;
  const listed = names.join(', ');
  return remaining > 0 ? `${listed} +${remaining}` : listed;
}

export function connectionHasUsedTable(
  connection: DataSourceConnection,
  identities: Iterable<string>,
): boolean {
  const prefix = connectionCatalogIdPrefix(connection.id);
  for (const identity of identities) {
    if (identity.startsWith(prefix)) return true;
  }
  return false;
}

export function searchConnections(
  connections: DataSourceConnection[],
  query: string,
): ConnectionSearchMatch[] {
  const needle = normalizedQuery(query);
  if (!needle) {
    return connections.map((connection) => ({ connection, matchingEntities: [] }));
  }

  return connections.flatMap((connection) => {
    const matchingEntities = matchingEntitiesForConnection(connection, query);
    if (!connectionNameMatches(connection, needle) && matchingEntities.length === 0) {
      return [];
    }
    return [{ connection, matchingEntities }];
  });
}

export function filterConnections(
  connections: DataSourceConnection[],
  query: string,
): DataSourceConnection[] {
  return searchConnections(connections, query).map((match) => match.connection);
}

export function filterSourceItems(items: SourceItem[], query: string): SourceItem[] {
  const needle = normalizedQuery(query);
  if (!needle) return items;
  return items.filter((item) =>
    `${item.key} ${item.label} ${item.fields.map((field) => field.name).join(' ')}`
      .toLowerCase()
      .includes(needle),
  );
}

export function dataSourceFileKind(name: string): DataSourceFile['kind'] {
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
    kind: dataSourceFileKind(name),
    sourceItem: {
      key: `file-${id}`,
      label,
      description: `${dataSourceFileKind(name)} file`,
      fields: cloneFields(fields),
    },
  };
}

export const DATA_SOURCE_FILES: DataSourceFile[] = [
  createDataSourceFile('orders-csv', 'Orders Data - CSV.csv', entityByKey('orders')?.fields),
  createDataSourceFile('sales-country', 'Sales by Country.xlsx', [
    { name: 'country', type: 'Attribute' },
    { name: 'region', type: 'Attribute' },
    { name: 'revenue', type: 'Number' },
    { name: 'year', type: 'Number' },
  ]),
  createDataSourceFile('online-tour', 'Online Tour Bookings.csv', [
    { name: 'booking_id', type: 'Number' },
    { name: 'tour_name', type: 'Attribute' },
    { name: 'guest_email', type: 'Attribute' },
    { name: 'party_size', type: 'Number' },
    { name: 'depart_date', type: 'Time' },
  ]),
  createDataSourceFile('online-tour-2', 'Online Tour Bookings 2.csv', [
    { name: 'booking_id', type: 'Number' },
    { name: 'channel', type: 'Attribute' },
    { name: 'deposit', type: 'Number' },
    { name: 'status', type: 'Attribute' },
  ]),
  createDataSourceFile('online-tours', 'Online Tours.csv', [
    { name: 'tour_id', type: 'Number' },
    { name: 'name', type: 'Attribute' },
    { name: 'duration_days', type: 'Number' },
    { name: 'price', type: 'Number' },
  ]),
  createDataSourceFile('gcp-isw', 'GCP_ISW.json', [
    { name: 'project_id', type: 'Attribute' },
    { name: 'dataset', type: 'Attribute' },
    { name: 'row_count', type: 'Number' },
    { name: 'synced_at', type: 'Time' },
  ]),
  createDataSourceFile('isw-products', 'ISW_Accts_Products.csv', [
    { name: 'account_id', type: 'Number' },
    { name: 'product_name', type: 'Attribute' },
    { name: 'sku', type: 'Attribute' },
    { name: 'quantity', type: 'Number' },
  ]),
  createDataSourceFile('test-file', 'Test File.csv', [
    { name: 'sample_id', type: 'Number' },
    { name: 'label', type: 'Attribute' },
    { name: 'flag', type: 'Attribute' },
  ]),
  createDataSourceFile('gcp1', 'GCp1.json', [
    { name: 'resource', type: 'Attribute' },
    { name: 'region', type: 'Attribute' },
    { name: 'cost', type: 'Number' },
  ]),
  createDataSourceFile('isw2', 'ISW2.csv', [
    { name: 'record_id', type: 'Number' },
    { name: 'account', type: 'Attribute' },
    { name: 'amount', type: 'Number' },
    { name: 'posted_at', type: 'Time' },
  ]),
  createDataSourceFile('adventureworks-upload', 'Upload for AdventureWorks.csv', entityByKey('sales_order_header')?.fields),
];
