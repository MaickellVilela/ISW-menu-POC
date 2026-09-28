import type { ConnectorKey } from './connectorIcons';
import {
  connectionEntityKeys,
  connectionHasSchemas,
  entitiesForConnectionId,
  entitiesForSchema,
  entityByKey,
  schemaForEntityKey,
  schemasForConnectionId,
  type ConnectionSchema,
} from './dataSourceEntities';
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

export interface CustomSqlQuery {
  connectionId: string;
  schemaName: string;
  sql: string;
  sourceItem: SourceItem;
}

const customSqlQueries: CustomSqlQuery[] = [];

const DEFAULT_CUSTOM_SQL_FIELDS: FieldDef[] = [
  { name: 'id', type: 'Number' },
  { name: 'value', type: 'Attribute' },
];

function inferSqlFieldType(name: string): FieldDef['type'] {
  const lower = name.toLowerCase();
  if (/(^id$|_id$|count|amount|qty|quantity|price|total)$/.test(lower)) return 'Number';
  if (/(date|time|_at)$/.test(lower)) return 'Time';
  return 'Attribute';
}

function sqlColumnName(token: string): string | null {
  const asMatch = token.match(/\bas\s+("([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][\w]*))$/i);
  if (asMatch) return asMatch[2] ?? asMatch[3] ?? asMatch[4] ?? asMatch[5] ?? null;
  const simple = token.match(/("([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][\w]*))$/);
  return simple?.[2] ?? simple?.[3] ?? simple?.[4] ?? simple?.[5] ?? null;
}

/** Reads column names from a simple `SELECT a, b FROM ...` statement. */
export function fieldsFromCustomSql(sql: string): FieldDef[] {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^select\s+(.+?)\s+from\s+/i);
  if (!match) return DEFAULT_CUSTOM_SQL_FIELDS.map((field) => ({ ...field }));

  const list = match[1].trim();
  if (!list || list === '*') return DEFAULT_CUSTOM_SQL_FIELDS.map((field) => ({ ...field }));

  const columns = list.split(',').flatMap((part) => {
    const token = part.trim();
    if (!token || token === '*') return [];
    const name = sqlColumnName(token);
    return name ? [{ name, type: inferSqlFieldType(name) }] : [];
  });

  return columns.length > 0
    ? columns.slice(0, 16)
    : DEFAULT_CUSTOM_SQL_FIELDS.map((field) => ({ ...field }));
}

export function createCustomSqlSourceItem(label: string, sql: string): SourceItem {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    key: `sql-${suffix}`,
    label: label.trim() || 'Custom SQL',
    description: 'Custom SQL',
    fields: fieldsFromCustomSql(sql),
  };
}

export function addCustomSqlQuery(query: CustomSqlQuery): CustomSqlQuery {
  const stored: CustomSqlQuery = {
    ...query,
    sourceItem: cloneEntity(query.sourceItem),
  };
  customSqlQueries.unshift(stored);
  return stored;
}

export function findCustomSqlQuery(entityKey: string): CustomSqlQuery | undefined {
  return customSqlQueries.find((query) => query.sourceItem.key === entityKey);
}

export function updateCustomSqlQuery(
  entityKey: string,
  patch: { connectionId: string; schemaName: string; sql: string; label: string },
): CustomSqlQuery | undefined {
  const existing = findCustomSqlQuery(entityKey);
  if (!existing) return undefined;
  existing.connectionId = patch.connectionId;
  existing.schemaName = patch.schemaName;
  existing.sql = patch.sql;
  existing.sourceItem.label = patch.label.trim() || existing.sourceItem.label;
  existing.sourceItem.fields = fieldsFromCustomSql(patch.sql);
  return existing;
}

export function defaultCustomSql(connectionName: string): string {
  const table = connectionName.replace(/\s+/g, '_') || 'table';
  return `SELECT id, name\nFROM ${table}`;
}

export function customSqlEntitiesFor(connectionId: string, schemaName?: string): SourceItem[] {
  return customSqlQueries
    .filter((query) => {
      if (query.connectionId !== connectionId) return false;
      if (!schemaName) return true;
      return query.schemaName === schemaName;
    })
    .map((query) => cloneEntity(query.sourceItem));
}

export function entitiesForConnection(connection: DataSourceConnection): SourceItem[] {
  const dataset = entitiesForConnectionId(connection.id);
  const catalog = dataset.length > 0
    ? dataset.map(cloneEntity)
    : connection.entityKeys.flatMap((key) => {
        const entity = entityByKey(key);
        return entity ? [cloneEntity(entity)] : [];
      });
  return [...customSqlEntitiesFor(connection.id), ...catalog];
}

export function schemasForConnection(connection: DataSourceConnection): ConnectionSchema[] {
  return schemasForConnectionId(connection.id);
}

export function connectionUsesSchemas(connection: DataSourceConnection): boolean {
  return connectionHasSchemas(connection.id);
}

export function entitiesForConnectionSchema(
  connection: DataSourceConnection,
  schemaName: string,
): SourceItem[] {
  return [
    ...customSqlEntitiesFor(connection.id, schemaName),
    ...entitiesForSchema(connection.id, schemaName).map(cloneEntity),
  ];
}

export function schemaNameForEntity(
  connection: DataSourceConnection,
  entityKey: string,
): string | undefined {
  return schemaForEntityKey(connection.id, entityKey);
}

export interface ConnectionSearchMatch {
  connection: DataSourceConnection;
  matchingEntities: SourceItem[];
  matchingSchemas: ConnectionSchema[];
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

export function schemaNameMatches(schema: ConnectionSchema, query: string): boolean {
  const needle = normalizedQuery(query);
  if (!needle) return true;
  return schema.name.toLowerCase().includes(needle);
}

export function matchingSchemasForConnection(
  connection: DataSourceConnection,
  query: string,
): ConnectionSchema[] {
  const needle = normalizedQuery(query);
  if (!needle) return [];
  return schemasForConnection(connection).filter((schema) => {
    if (schemaNameMatches(schema, query)) return true;
    return entitiesForConnectionSchema(connection, schema.name).some((entity) =>
      entityNameMatches(entity, query),
    );
  });
}

export function matchingEntitiesForSchema(
  connection: DataSourceConnection,
  schemaName: string,
  query: string,
): SourceItem[] {
  const entities = entitiesForConnectionSchema(connection, schemaName);
  const needle = normalizedQuery(query);
  if (!needle) return [];
  if (schemaNameMatches({ name: schemaName, entityKeys: [] }, query)) return entities;
  return entities.filter((entity) => entityNameMatches(entity, query));
}

export function matchingEntityCaption(entities: SourceItem[], limit = 3): string {
  if (entities.length === 0) return '';
  const names = entities.slice(0, limit).map((entity) => entity.label);
  const remaining = entities.length - names.length;
  const listed = names.join(', ');
  return remaining > 0 ? `${listed} +${remaining}` : listed;
}

/** One labeled group of matched names for a connection-level search caption, tagged by result type. */
export interface CatalogCaptionGroup {
  kind: 'schema' | 'entity';
  text: string;
}

/**
 * Groups a connection's matches by result type instead of picking one — a search term can match a
 * schema name and an unrelated table name at once, and the caller needs to show both distinctly
 * rather than silently dropping one (previously `matchingCatalogCaption` favored entities only).
 */
export function matchingCatalogCaptionGroups(match: ConnectionSearchMatch, limit = 3): CatalogCaptionGroup[] {
  const groups: CatalogCaptionGroup[] = [];
  if (match.matchingSchemas.length > 0) {
    const names = match.matchingSchemas.slice(0, limit).map((schema) => schema.name);
    const remaining = match.matchingSchemas.length - names.length;
    const listed = names.join(', ');
    groups.push({ kind: 'schema', text: remaining > 0 ? `${listed} +${remaining}` : listed });
  }
  if (match.matchingEntities.length > 0) {
    groups.push({ kind: 'entity', text: matchingEntityCaption(match.matchingEntities, limit) });
  }
  return groups;
}

export function schemaHasUsedTable(
  connection: DataSourceConnection,
  schema: ConnectionSchema,
  identities: Iterable<string>,
): boolean {
  const keys = [
    ...schema.entityKeys,
    ...customSqlEntitiesFor(connection.id, schema.name).map((entity) => entity.key),
  ];
  for (const entityKey of keys) {
    const identity = entityCatalogSelectionId(connection.id, entityKey);
    for (const used of identities) {
      if (used === identity) return true;
    }
  }
  return false;
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
    return connections.map((connection) => ({
      connection,
      matchingEntities: [],
      matchingSchemas: [],
    }));
  }

  return connections.flatMap((connection) => {
    const matchingEntities = matchingEntitiesForConnection(connection, query);
    const matchingSchemas = matchingSchemasForConnection(connection, query);
    if (
      !connectionNameMatches(connection, needle)
      && matchingEntities.length === 0
      && matchingSchemas.length === 0
    ) {
      return [];
    }
    return [{ connection, matchingEntities, matchingSchemas }];
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

export type ParsedCatalogSourceId =
  | { kind: 'entity'; connectionId: string; entityKey: string }
  | { kind: 'file'; fileId: string };

/** Reads `entity:connectionId:entityKey` or `file:fileId`. */
export function parseCatalogSourceId(sourceId: string): ParsedCatalogSourceId | null {
  if (!sourceId) return null;
  if (sourceId.startsWith('file:')) {
    const fileId = sourceId.slice('file:'.length);
    return fileId ? { kind: 'file', fileId } : null;
  }
  if (!sourceId.startsWith('entity:')) return null;
  const rest = sourceId.slice('entity:'.length);
  const separator = rest.indexOf(':');
  if (separator <= 0 || separator === rest.length - 1) return null;
  return {
    kind: 'entity',
    connectionId: rest.slice(0, separator),
    entityKey: rest.slice(separator + 1),
  };
}

export function catalogSelectionFromSourceId(sourceId: string): SourceCatalogSelection | null {
  const parsed = parseCatalogSourceId(sourceId);
  if (!parsed) return null;

  if (parsed.kind === 'file') {
    const file = DATA_SOURCE_FILES.find((candidate) => candidate.id === parsed.fileId);
    if (!file) return null;
    return { kind: 'file', file, sourceItem: file.sourceItem };
  }

  const connection = DATA_SOURCE_CONNECTIONS.find((candidate) => candidate.id === parsed.connectionId);
  if (!connection) return null;
  const sourceItem = entitiesForConnection(connection).find((entity) => entity.key === parsed.entityKey);
  if (!sourceItem) return null;
  return { kind: 'entity', connection, sourceItem };
}
