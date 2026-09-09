import { ref, watch, type Ref } from 'vue';
import {
  sourceCatalogSelectionId,
  type DataSourceFile,
  type SourceCatalogSelection,
} from './dataSourceCatalog';
import type { ConnectorKey } from './connectorIcons';
import type {
  FieldDef,
  FieldOption,
  SourceItem,
} from './useDataSourceCanvas';

export const FILTER_VALUE_STORAGE_KEY = 'datasource-filter-value-settings-v1';

export interface FilterValueFileOptions {
  description: string;
  delimiter: string;
  quoteCharacter: string;
  previewLimit: number;
  hasHeaders: boolean;
  replaceOnUpload: boolean;
}

interface FilterValueProviderBase {
  id: string;
  name: string;
  sourceItem: SourceItem;
}

export interface EntityFilterValueProvider extends FilterValueProviderBase {
  kind: 'entity';
  connection: {
    id: string;
    name: string;
    connector: ConnectorKey;
  };
}

export interface FileFilterValueProvider extends FilterValueProviderBase {
  kind: 'file';
  file: {
    id: string;
    name: string;
    kind: DataSourceFile['kind'];
    options: FilterValueFileOptions;
  };
}

export type FilterValueProvider =
  | EntityFilterValueProvider
  | FileFilterValueProvider;

export interface FilterValueMapping {
  id: string;
  targetField: string;
  targetLabel: string;
  valueField: string;
  labelField: string;
}

export interface FilterValueConfiguration {
  provider: FilterValueProvider | null;
  mappings: FilterValueMapping[];
}

export interface SourcePreview {
  columns: string[];
  rows: Array<Record<string, string>>;
}

export interface ApiEndpointExample {
  id: 'append' | 'replace' | 'delete';
  title: string;
  method: 'POST' | 'PUT' | 'DELETE';
  requestBody: 'multipart/form-data' | null;
  command: string;
}

export function defaultFilterValueConfiguration(): FilterValueConfiguration {
  return {
    provider: null,
    mappings: [],
  };
}

export function defaultFilterValueFileOptions(): FilterValueFileOptions {
  return {
    description: '',
    delimiter: ',',
    quoteCharacter: '"',
    previewLimit: 10,
    hasHeaders: true,
    replaceOnUpload: true,
  };
}

function cloneSourceItem(item: SourceItem): SourceItem {
  return {
    ...item,
    fields: item.fields.map((field) => ({ ...field })),
  };
}

export function providerFromCatalogSelection(
  selection: SourceCatalogSelection,
): FilterValueProvider {
  if (selection.kind === 'entity') {
    return {
      id: sourceCatalogSelectionId(selection),
      kind: 'entity',
      name: selection.sourceItem.label,
      sourceItem: cloneSourceItem(selection.sourceItem),
      connection: {
        id: selection.connection.id,
        name: selection.connection.name,
        connector: selection.connection.connector,
      },
    };
  }

  return {
    id: sourceCatalogSelectionId(selection),
    kind: 'file',
    name: selection.sourceItem.label,
    sourceItem: cloneSourceItem(selection.sourceItem),
    file: {
      id: selection.file.id,
      name: selection.file.name,
      kind: selection.file.kind,
      options: defaultFilterValueFileOptions(),
    },
  };
}

export function createFilterValueMapping(
  id: string,
  target?: FieldOption,
  providerField?: FieldDef,
): FilterValueMapping {
  return {
    id,
    targetField: target?.value ?? '',
    targetLabel: target?.name ?? '',
    valueField: providerField?.name ?? '',
    labelField: '',
  };
}

export function isFilterValueMappingComplete(mapping: FilterValueMapping): boolean {
  return Boolean(mapping.targetField && mapping.valueField);
}

export function areFilterValueMappingsValid(mappings: FilterValueMapping[]): boolean {
  if (mappings.length === 0 || !mappings.every(isFilterValueMappingComplete)) return false;
  return new Set(mappings.map((mapping) => mapping.targetField)).size === mappings.length;
}

export function mappingLabel(
  mapping: FilterValueMapping,
  targetFields: FieldOption[],
): string {
  const target = targetFields.find((field) => field.value === mapping.targetField);
  return target?.name ?? mapping.targetLabel ?? mapping.targetField;
}

function sampleAttribute(fieldName: string, index: number): string {
  const lowerName = fieldName.toLowerCase();
  if (lowerName.includes('status')) {
    return ['Active', 'Pending', 'Closed', 'Paused', 'Archived'][index % 5];
  }
  if (lowerName.includes('country')) {
    return ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'][index % 5];
  }
  if (lowerName.includes('name')) {
    return ['North', 'South', 'Central', 'Enterprise', 'Consumer'][index % 5];
  }
  return `Value ${index + 1}`;
}

function sampleCell(field: FieldDef, index: number): string {
  const type = field.type.trim().toLowerCase();
  const lowerName = field.name.toLowerCase();
  if (lowerName === 'id' || lowerName.endsWith('_id')) {
    return `${field.name.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(4, '0')}`;
  }
  if (type === 'number' || type === 'numeric') {
    return String((index + 1) * 10);
  }
  if (type === 'time' || type === 'date' || type === 'datetime') {
    return `2026-${String(index + 1).padStart(2, '0')}-01`;
  }
  return sampleAttribute(field.name, index);
}

export function sourcePreview(item: SourceItem, limit = 7): SourcePreview {
  const columns = item.fields.map((field) => field.name);
  const rowCount = Math.min(20, Math.max(1, Math.round(limit)));
  const rows = Array.from({ length: rowCount }, (_, index) =>
    Object.fromEntries(item.fields.map((field) => [field.name, sampleCell(field, index)])),
  );
  return { columns, rows };
}

export function apiEndpointExamples(
  provider: FileFilterValueProvider,
): ApiEndpointExample[] {
  const endpoint = '${BASE_URL}/discovery/api/uploads/'
    + encodeURIComponent(provider.file.id)
    + '/data';
  const authentication = '--user "${USERNAME}:${PASSWORD}"';
  const multipart = [
    '-H "Content-Type: multipart/form-data"',
    '-F "fileData=@data.csv"',
    `-F "delimiter=${provider.file.options.delimiter}"`,
    `-F "includesHeader=${provider.file.options.hasHeaders}"`,
  ].join(' \\\n  ');

  return [
    {
      id: 'append',
      title: 'Append additional data to file upload',
      method: 'POST',
      requestBody: 'multipart/form-data',
      command: `curl -v ${authentication} "${endpoint}" -X POST \\\n  ${multipart}`,
    },
    {
      id: 'replace',
      title: 'Replace data in file upload',
      method: 'PUT',
      requestBody: 'multipart/form-data',
      command: `curl -v ${authentication} "${endpoint}" -X PUT \\\n  ${multipart}`,
    },
    {
      id: 'delete',
      title: 'Delete data from file upload',
      method: 'DELETE',
      requestBody: null,
      command: `curl -v ${authentication} "${endpoint}" -X DELETE`,
    },
  ];
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function previewLimitValue(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1000, Math.max(1, Math.round(value)));
}

function parseFields(value: unknown): FieldDef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const field = candidate as Partial<FieldDef>;
    const name = stringValue(field.name);
    if (!name) return [];
    return [{ name, type: stringValue(field.type, 'Attribute') }];
  });
}

function parseSourceItem(value: unknown): SourceItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<SourceItem>;
  const key = stringValue(item.key);
  const label = stringValue(item.label);
  if (!key || !label) return null;
  return {
    key,
    label,
    description: stringValue(item.description),
    fields: parseFields(item.fields),
  };
}

function parseFileOptions(value: unknown): FilterValueFileOptions {
  const fallback = defaultFilterValueFileOptions();
  if (!value || typeof value !== 'object') return fallback;
  const options = value as Partial<FilterValueFileOptions>;
  return {
    description: stringValue(options.description),
    delimiter: stringValue(options.delimiter, fallback.delimiter),
    quoteCharacter: stringValue(options.quoteCharacter, fallback.quoteCharacter),
    previewLimit: previewLimitValue(options.previewLimit, fallback.previewLimit),
    hasHeaders: booleanValue(options.hasHeaders, fallback.hasHeaders),
    replaceOnUpload: booleanValue(options.replaceOnUpload, fallback.replaceOnUpload),
  };
}

function connectorValue(value: unknown): ConnectorKey | null {
  const connectors: ConnectorKey[] = [
    'bigquery',
    'elasticsearch',
    'hive',
    'impala',
    'mongodb',
    'postgresql',
    'python',
    'redshift',
    's3',
    'snowflake',
  ];
  return connectors.includes(value as ConnectorKey) ? value as ConnectorKey : null;
}

function fileKindValue(value: unknown): DataSourceFile['kind'] | null {
  return value === 'CSV' || value === 'Excel' || value === 'JSON' || value === 'File'
    ? value
    : null;
}

function parseProvider(value: unknown): FilterValueProvider | null {
  if (!value || typeof value !== 'object') return null;
  const provider = value as Partial<FilterValueProvider>;
  const sourceItem = parseSourceItem(provider.sourceItem);
  const id = stringValue(provider.id);
  const name = stringValue(provider.name);
  if (!sourceItem || !id || !name) return null;

  if (provider.kind === 'entity' && provider.connection) {
    const connectionId = stringValue(provider.connection.id);
    const connectionName = stringValue(provider.connection.name);
    const connector = connectorValue(provider.connection.connector);
    if (!connectionId || !connectionName || !connector) return null;
    return {
      id,
      kind: 'entity',
      name,
      sourceItem,
      connection: {
        id: connectionId,
        name: connectionName,
        connector,
      },
    };
  }

  if (provider.kind === 'file' && provider.file) {
    const fileId = stringValue(provider.file.id);
    const fileName = stringValue(provider.file.name);
    const kind = fileKindValue(provider.file.kind);
    if (!fileId || !fileName || !kind) return null;
    return {
      id,
      kind: 'file',
      name,
      sourceItem,
      file: {
        id: fileId,
        name: fileName,
        kind,
        options: parseFileOptions(provider.file.options),
      },
    };
  }

  return null;
}

function parseMappings(value: unknown): FilterValueMapping[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const mapping = candidate as Partial<FilterValueMapping>;
    const parsed: FilterValueMapping = {
      id: stringValue(mapping.id, `saved-mapping-${index}`),
      targetField: stringValue(mapping.targetField),
      targetLabel: stringValue(mapping.targetLabel),
      valueField: stringValue(mapping.valueField),
      labelField: stringValue(mapping.labelField),
    };
    return isFilterValueMappingComplete(parsed) ? [parsed] : [];
  });
}

export function parseFilterValueConfiguration(raw: string | null): FilterValueConfiguration {
  if (!raw) return defaultFilterValueConfiguration();
  try {
    const parsed = JSON.parse(raw) as Partial<FilterValueConfiguration>;
    return {
      provider: parseProvider(parsed.provider),
      mappings: parseMappings(parsed.mappings),
    };
  } catch {
    return defaultFilterValueConfiguration();
  }
}

export function useFilterValueConfiguration() {
  const configuration: Ref<FilterValueConfiguration> = ref(
    defaultFilterValueConfiguration(),
  );

  function persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      FILTER_VALUE_STORAGE_KEY,
      JSON.stringify(configuration.value),
    );
  }

  function load(): void {
    if (typeof window === 'undefined') return;
    configuration.value = parseFilterValueConfiguration(
      window.localStorage.getItem(FILTER_VALUE_STORAGE_KEY),
    );
  }

  function save(provider: FilterValueProvider, mappings: FilterValueMapping[]): void {
    configuration.value = {
      provider,
      mappings: mappings.map((mapping) => ({ ...mapping })),
    };
  }

  function updateProvider(provider: FilterValueProvider): void {
    configuration.value = { ...configuration.value, provider };
  }

  function clear(): void {
    configuration.value = defaultFilterValueConfiguration();
  }

  watch(configuration, persist, { deep: true });

  return {
    configuration,
    load,
    save,
    updateProvider,
    clear,
  };
}
