import {
  DATA_SOURCE_CONNECTIONS,
  DATA_SOURCE_FILES,
  connectionUsesSchemas,
  createCustomSqlSourceItem,
  defaultCustomSql,
  entitiesForConnection,
  entitiesForConnectionSchema,
  entityCatalogSelectionId,
  fieldsFromCustomSql,
  fileCatalogSelectionId,
  findCustomSqlQuery,
  parseCatalogSourceId,
  schemaNameForEntity,
  schemasForConnection,
  updateCustomSqlQuery,
  addCustomSqlQuery,
  type DataSourceConnection,
} from './dataSourceCatalog';
import {
  resolvedTableSourceId,
  type CanvasNode,
  type FieldDef,
  type SourceItem,
  type TableRebindPatch,
} from './useDataSourceCanvas';

export type InspectorSourceKind = 'existing' | 'sql';
export type InspectorCatalogMode = 'entity' | 'file';

export interface EntityInspectorDraft {
  name: string;
  connectionId: string;
  schemaName: string;
  sourceKind: InspectorSourceKind;
  entityKey: string;
  sql: string;
  cacheEnabled: boolean;
  includedByName: Record<string, boolean>;
}

export function isCustomSqlEntity(item: Pick<SourceItem, 'key' | 'description'>): boolean {
  return item.description === 'Custom SQL' || item.key.startsWith('sql-');
}

export function inspectorCatalogMode(node: CanvasNode): InspectorCatalogMode {
  const parsed = parseCatalogSourceId(resolvedTableSourceId(node));
  return parsed?.kind === 'file' ? 'file' : 'entity';
}

export function includedMapFromNames(
  available: FieldDef[],
  includedNames: Iterable<string>,
): Record<string, boolean> {
  const selected = new Set(includedNames);
  const hasSelection = selected.size > 0;
  return Object.fromEntries(
    available.map((field) => [field.name, hasSelection ? selected.has(field.name) : true]),
  );
}

export function includedFieldsFromDraft(available: FieldDef[], includedByName: Record<string, boolean>): FieldDef[] {
  const included = available.filter((field) => includedByName[field.name] !== false);
  return included.map((field) => ({ ...field }));
}

export function filterInspectorFields(
  fields: FieldDef[],
  query: string,
  hideUnused: boolean,
  includedByName: Record<string, boolean>,
): FieldDef[] {
  const needle = query.trim().toLowerCase();
  return fields.filter((field) => {
    if (hideUnused && includedByName[field.name] === false) return false;
    if (!needle) return true;
    return `${field.name} ${field.type}`.toLowerCase().includes(needle);
  });
}

export function connectionForDraft(draft: EntityInspectorDraft): DataSourceConnection | undefined {
  return DATA_SOURCE_CONNECTIONS.find((connection) => connection.id === draft.connectionId);
}

export function catalogEntitiesForDraft(draft: EntityInspectorDraft): SourceItem[] {
  const connection = connectionForDraft(draft);
  if (!connection) return [];
  const entities = draft.schemaName && connectionUsesSchemas(connection)
    ? entitiesForConnectionSchema(connection, draft.schemaName)
    : entitiesForConnection(connection);
  return entities.filter((entity) => !isCustomSqlEntity(entity));
}

export function selectedCatalogEntity(draft: EntityInspectorDraft): SourceItem | undefined {
  return catalogEntitiesForDraft(draft).find((entity) => entity.key === draft.entityKey);
}

export function availableFieldsForDraft(draft: EntityInspectorDraft, fileFields: FieldDef[]): FieldDef[] {
  if (draft.sourceKind === 'sql') return fieldsFromCustomSql(draft.sql);
  if (!draft.connectionId) return fileFields.map((field) => ({ ...field }));
  return (selectedCatalogEntity(draft)?.fields ?? []).map((field) => ({ ...field }));
}

export function fileFieldsForNode(node: CanvasNode): FieldDef[] {
  const parsed = parseCatalogSourceId(resolvedTableSourceId(node));
  if (parsed?.kind !== 'file') return (node.fields ?? []).map((field) => ({ ...field }));
  const file = DATA_SOURCE_FILES.find((candidate) => candidate.id === parsed.fileId);
  return (file?.sourceItem.fields ?? node.fields ?? []).map((field) => ({ ...field }));
}

function firstSchemaName(connection: DataSourceConnection): string {
  return schemasForConnection(connection)[0]?.name ?? '';
}

function firstEntityKey(draft: EntityInspectorDraft): string {
  return catalogEntitiesForDraft(draft)[0]?.key ?? '';
}

function defaultSqlForConnection(connectionId: string): string {
  const connection = DATA_SOURCE_CONNECTIONS.find((item) => item.id === connectionId);
  return defaultCustomSql(connection?.name ?? 'table');
}

export function draftFromNode(node: CanvasNode): EntityInspectorDraft {
  const sourceId = resolvedTableSourceId(node);
  const parsed = parseCatalogSourceId(sourceId);
  const name = node.customName?.trim() || node.label;
  const cacheEnabled = Boolean(node.entityCacheEnabled);

  if (parsed?.kind === 'file') {
    const fields = fileFieldsForNode(node);
    return {
      name,
      connectionId: '',
      schemaName: '',
      sourceKind: 'existing',
      entityKey: parsed.fileId,
      sql: '',
      cacheEnabled,
      includedByName: includedMapFromNames(fields, (node.fields ?? fields).map((field) => field.name)),
    };
  }

  const connectionId = parsed?.kind === 'entity' ? parsed.connectionId : 'managed';
  const connection = DATA_SOURCE_CONNECTIONS.find((item) => item.id === connectionId);
  const entityKey = parsed?.kind === 'entity' ? parsed.entityKey : (node.sourceKey ?? '');
  const storedSql = findCustomSqlQuery(entityKey);
  const sourceKind: InspectorSourceKind = storedSql || isCustomSqlEntity({ key: entityKey, description: '' })
    ? 'sql'
    : 'existing';
  const schemaName = connection
    ? (storedSql?.schemaName || schemaNameForEntity(connection, entityKey) || (connectionUsesSchemas(connection) ? firstSchemaName(connection) : ''))
    : '';
  const sql = storedSql?.sql ?? defaultSqlForConnection(connectionId);
  const draft: EntityInspectorDraft = {
    name,
    connectionId,
    schemaName,
    sourceKind,
    entityKey,
    sql,
    cacheEnabled,
    includedByName: {},
  };
  const available = availableFieldsForDraft(draft, node.fields ?? []);
  draft.includedByName = includedMapFromNames(
    available,
    (node.fields ?? available).map((field) => field.name),
  );
  return draft;
}

export function applyConnectionChange(draft: EntityInspectorDraft, connectionId: string): EntityInspectorDraft {
  if (draft.connectionId === connectionId) return draft;
  const connection = DATA_SOURCE_CONNECTIONS.find((item) => item.id === connectionId);
  const next: EntityInspectorDraft = {
    ...draft,
    connectionId,
    schemaName: connection && connectionUsesSchemas(connection) ? firstSchemaName(connection) : '',
    entityKey: '',
    sql: draft.sourceKind === 'sql' ? defaultSqlForConnection(connectionId) : draft.sql,
  };
  if (next.sourceKind === 'existing') next.entityKey = firstEntityKey(next);
  return syncDraftEntity(draft, next);
}

export function applySchemaChange(draft: EntityInspectorDraft, schemaName: string): EntityInspectorDraft {
  if (draft.schemaName === schemaName) return draft;
  const next: EntityInspectorDraft = {
    ...draft,
    schemaName,
    entityKey: '',
  };
  if (next.sourceKind === 'existing') next.entityKey = firstEntityKey(next);
  return syncDraftEntity(draft, next);
}

export function applyEntityChange(draft: EntityInspectorDraft, entityKey: string): EntityInspectorDraft {
  if (draft.entityKey === entityKey) return draft;
  const next: EntityInspectorDraft = { ...draft, entityKey };
  return syncDraftEntity(draft, next);
}

export function applySourceKindChange(draft: EntityInspectorDraft, sourceKind: InspectorSourceKind): EntityInspectorDraft {
  if (draft.sourceKind === sourceKind) return draft;
  const next: EntityInspectorDraft = {
    ...draft,
    sourceKind,
    entityKey: sourceKind === 'sql' ? draft.entityKey : (draft.entityKey || firstEntityKey({ ...draft, sourceKind: 'existing' })),
    sql: sourceKind === 'sql' ? (draft.sql.trim() ? draft.sql : defaultSqlForConnection(draft.connectionId)) : draft.sql,
  };
  if (sourceKind === 'existing' && !catalogEntitiesForDraft(next).some((entity) => entity.key === next.entityKey)) {
    next.entityKey = firstEntityKey(next);
  }
  return syncDraftEntity(draft, next);
}

function syncDraftEntity(previous: EntityInspectorDraft, next: EntityInspectorDraft): EntityInspectorDraft {
  const previousEntity = selectedCatalogEntity(previous);
  const nextEntity = selectedCatalogEntity(next);
  const nextLabel = next.sourceKind === 'sql'
    ? next.name
    : (nextEntity?.label ?? next.name);
  const name = !previous.name.trim() || previous.name.trim() === (previousEntity?.label ?? previous.name)
    ? nextLabel
    : previous.name;
  const available = availableFieldsForDraft({ ...next, name }, []);
  return {
    ...next,
    name,
    includedByName: includedMapFromNames(available, available.map((field) => field.name)),
  };
}

export function refreshSqlFieldMap(draft: EntityInspectorDraft): Record<string, boolean> {
  const available = fieldsFromCustomSql(draft.sql);
  const kept = available.filter((field) => draft.includedByName[field.name] !== false).map((field) => field.name);
  return includedMapFromNames(available, kept);
}

export function isInspectorDraftValid(
  draft: EntityInspectorDraft,
  mode: InspectorCatalogMode,
  available: FieldDef[],
): boolean {
  if (!draft.name.trim()) return false;
  if (!available.some((field) => draft.includedByName[field.name] !== false)) return false;
  if (mode === 'file') return true;
  if (!draft.connectionId) return false;
  const connection = connectionForDraft(draft);
  if (connection && connectionUsesSchemas(connection) && !draft.schemaName) return false;
  if (draft.sourceKind === 'sql') return Boolean(draft.sql.trim());
  return Boolean(draft.entityKey);
}

export function isInspectorDraftDirty(draft: EntityInspectorDraft, baseline: EntityInspectorDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(baseline);
}

export function catalogViewSourceId(draft: EntityInspectorDraft): string {
  if (!draft.connectionId) return '';
  const key = draft.sourceKind === 'existing'
    ? (draft.entityKey || firstEntityKey(draft))
    : (catalogEntitiesForDraft(draft)[0]?.key ?? '');
  return key ? entityCatalogSelectionId(draft.connectionId, key) : '';
}

export function fileSourceLabel(node: CanvasNode): string {
  const parsed = parseCatalogSourceId(resolvedTableSourceId(node));
  if (parsed?.kind !== 'file') return 'File';
  return DATA_SOURCE_FILES.find((file) => file.id === parsed.fileId)?.name ?? node.label;
}

export function applyInspectorDraft(node: CanvasNode, draft: EntityInspectorDraft): TableRebindPatch {
  const mode = inspectorCatalogMode(node);
  if (mode === 'file') {
    const fields = includedFieldsFromDraft(fileFieldsForNode(node), draft.includedByName);
    return {
      label: node.label,
      sourceKey: node.sourceKey ?? node.label,
      sourceId: resolvedTableSourceId(node) || fileCatalogSelectionId(draft.entityKey),
      customName: draft.name,
      fields,
      entityCacheEnabled: draft.cacheEnabled,
    };
  }

  if (draft.sourceKind === 'sql') {
    const existingKey = isCustomSqlEntity({ key: node.sourceKey ?? '', description: '' }) ? node.sourceKey : undefined;
    const label = draft.name.trim();
    const updated = existingKey
      ? updateCustomSqlQuery(existingKey, {
          connectionId: draft.connectionId,
          schemaName: draft.schemaName,
          sql: draft.sql,
          label,
        })
      : undefined;
    const stored = updated ?? addCustomSqlQuery({
      connectionId: draft.connectionId,
      schemaName: draft.schemaName,
      sql: draft.sql,
      sourceItem: createCustomSqlSourceItem(label, draft.sql),
    });
    const available = stored.sourceItem.fields;
    return {
      label: stored.sourceItem.label,
      sourceKey: stored.sourceItem.key,
      sourceId: entityCatalogSelectionId(draft.connectionId, stored.sourceItem.key),
      customName: draft.name,
      fields: includedFieldsFromDraft(available, draft.includedByName),
      entityCacheEnabled: draft.cacheEnabled,
    };
  }

  const entity = selectedCatalogEntity(draft);
  if (!entity) {
    return {
      label: node.label,
      sourceKey: node.sourceKey ?? node.label,
      sourceId: resolvedTableSourceId(node),
      customName: draft.name,
      fields: includedFieldsFromDraft(node.fields ?? [], draft.includedByName),
      entityCacheEnabled: draft.cacheEnabled,
    };
  }

  return {
    label: entity.label,
    sourceKey: entity.key,
    sourceId: entityCatalogSelectionId(draft.connectionId, entity.key),
    customName: draft.name,
    fields: includedFieldsFromDraft(entity.fields, draft.includedByName),
    entityCacheEnabled: draft.cacheEnabled,
  };
}
