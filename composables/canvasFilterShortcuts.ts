import type { FieldDef, FieldOption } from './useDataSourceCanvas';

export type CanvasFilterDestination = 'performance' | 'global';

export interface CanvasFilterShortcut {
  destination: CanvasFilterDestination;
  field?: FieldOption;
  /** Catalog id of the canvas table that opened this shortcut (`entity:…` or `file:…`). */
  sourceId?: string;
  /** Existing global filter to reopen instead of creating a new one. */
  filterId?: string;
  /** Open the performance-filter mapping step when this table is already the provider. */
  openMapping?: boolean;
}

export const PERFORMANCE_FILTER_ORIGIN_LABEL = 'Performance filters';
export const GLOBAL_FILTER_ORIGIN_LABEL = 'Global filters';

export function performanceFilterShortcut(
  sourceId?: string,
  openMapping = false,
): CanvasFilterShortcut {
  const shortcut: CanvasFilterShortcut = { destination: 'performance' };
  if (sourceId) shortcut.sourceId = sourceId;
  if (openMapping) shortcut.openMapping = true;
  return shortcut;
}

export function fieldOptionFromTableField(entityLabel: string, field: FieldDef): FieldOption {
  return {
    value: `${entityLabel}.${field.name}`,
    name: field.name,
    type: field.type,
    entity: entityLabel,
  };
}

export function globalFilterShortcut(
  entityLabel: string,
  field: FieldDef,
  filterId?: string,
): CanvasFilterShortcut {
  return {
    destination: 'global',
    field: fieldOptionFromTableField(entityLabel, field),
    ...(filterId ? { filterId } : {}),
  };
}

export function globalFiltersPageShortcut(): CanvasFilterShortcut {
  return { destination: 'global' };
}

export function mergeFieldOption(fields: FieldOption[], extra?: FieldOption | null): FieldOption[] {
  if (!extra) return fields;
  if (fields.some((field) => field.value === extra.value)) return fields;
  return [extra, ...fields];
}

export type DataSourceSettingsSection =
  | 'time-bar'
  | 'cache'
  | 'filter-values'
  | 'map-locale'
  | 'global-filters';

export const DATA_SOURCE_SETTINGS_SECTIONS: DataSourceSettingsSection[] = [
  'time-bar',
  'cache',
  'filter-values',
  'map-locale',
  'global-filters',
];

export function parseSettingsSection(value: unknown): DataSourceSettingsSection | null {
  if (typeof value !== 'string') return null;
  return DATA_SOURCE_SETTINGS_SECTIONS.includes(value as DataSourceSettingsSection)
    ? value as DataSourceSettingsSection
    : null;
}

export function settingsSectionForShortcut(
  shortcut: CanvasFilterShortcut | null | undefined,
): DataSourceSettingsSection | null {
  if (!shortcut) return null;
  return shortcut.destination === 'performance' ? 'filter-values' : 'global-filters';
}

export const FILTER_SHORTCUT_INTENT = 'filter';
export const FILTER_SHORTCUT_MAPPING_STEP = 'mapping';

export function parseSourceIdQuery(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function parseFilterFieldQuery(value: unknown, type?: unknown): FieldOption | null {
  if (typeof value !== 'string') return null;
  const separator = value.lastIndexOf('.');
  if (separator <= 0 || separator === value.length - 1) return null;
  return {
    value,
    entity: value.slice(0, separator),
    name: value.slice(separator + 1),
    type: typeof type === 'string' && type ? type : 'Attribute',
  };
}

export function shortcutFromConfigureQuery(
  query: Record<string, unknown> | { [key: string]: unknown },
): CanvasFilterShortcut | null {
  if (query.intent !== FILTER_SHORTCUT_INTENT) return null;
  const section = parseSettingsSection(query.configure);
  if (section === 'filter-values') {
    return performanceFilterShortcut(
      parseSourceIdQuery(query.source) ?? undefined,
      query.step === FILTER_SHORTCUT_MAPPING_STEP,
    );
  }
  if (section === 'global-filters') {
    const field = parseFilterFieldQuery(query.field, query.fieldType);
    const filterId = parseSourceIdQuery(query.filter) ?? undefined;
    if (field) {
      return filterId
        ? { destination: 'global', field, filterId }
        : { destination: 'global', field };
    }
    return { destination: 'global' };
  }
  return null;
}

export function configureQueryForShortcut(shortcut: CanvasFilterShortcut): Record<string, string> {
  const query: Record<string, string> = {
    configure: settingsSectionForShortcut(shortcut) ?? 'time-bar',
    intent: FILTER_SHORTCUT_INTENT,
  };
  if (shortcut.field?.value) {
    query.field = shortcut.field.value;
    if (shortcut.field.type) query.fieldType = shortcut.field.type;
  }
  if (shortcut.sourceId) query.source = shortcut.sourceId;
  if (shortcut.filterId) query.filter = shortcut.filterId;
  if (shortcut.openMapping) query.step = FILTER_SHORTCUT_MAPPING_STEP;
  return query;
}

export function queryWithoutFilterIntent(
  query: Record<string, unknown>,
): Record<string, string | string[]> {
  const next: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'intent' || value === undefined || value === null) continue;
    if (typeof value === 'string' || Array.isArray(value)) next[key] = value;
  }
  return next;
}
