import { computed, ref, watch, type Ref } from 'vue';
import {
  CANVAS_LAYOUT_STORAGE_KEY,
  fieldsFromCanvasNodes,
  parseCanvasNodes,
  type FieldOption,
} from './useDataSourceCanvas';

export const CACHE_SETTINGS_STORAGE_KEY = 'datasource-cache-settings-v1';

export interface CacheFieldRow {
  id: string;
  label: string;
  entity: string;
  dataType: string;
  cacheEnabled: boolean;
  includeInSchedule: boolean;
  lastManualRefreshAt: number | null;
}

export interface CacheSettings {
  dataCacheEnabled: boolean;
  statisticsCacheEnabled: boolean;
  scheduleRefreshEnabled: boolean;
  fields: CacheFieldRow[];
}

export function humanizeFieldName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function rowFromFieldOption(option: FieldOption, previous?: CacheFieldRow): CacheFieldRow {
  return {
    id: option.value,
    label: humanizeFieldName(option.name),
    entity: option.entity,
    dataType: option.type,
    cacheEnabled: previous?.cacheEnabled ?? true,
    includeInSchedule: previous?.includeInSchedule ?? false,
    lastManualRefreshAt: previous?.lastManualRefreshAt ?? null,
  };
}

/** Rebuilds rows from the canvas schema while keeping the user's per-field choices. */
export function mergeFieldRows(options: FieldOption[], previous: CacheFieldRow[]): CacheFieldRow[] {
  const byId = new Map(previous.map((row) => [row.id, row]));
  return options.map((option) => rowFromFieldOption(option, byId.get(option.value)));
}

export function filterFieldRows(rows: CacheFieldRow[], query: string): CacheFieldRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => {
    const haystack = `${row.label} ${row.entity} ${row.dataType}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function setFieldCacheEnabled(rows: CacheFieldRow[], id: string, enabled: boolean): CacheFieldRow[] {
  return rows.map((row) => (row.id === id ? { ...row, cacheEnabled: enabled } : row));
}

export function setAllFieldsCacheEnabled(rows: CacheFieldRow[], enabled: boolean): CacheFieldRow[] {
  return rows.map((row) => ({ ...row, cacheEnabled: enabled }));
}

export function setFieldScheduled(rows: CacheFieldRow[], id: string, included: boolean): CacheFieldRow[] {
  return rows.map((row) => (row.id === id ? { ...row, includeInSchedule: included } : row));
}

export function markFieldRefreshed(rows: CacheFieldRow[], id: string, at: number): CacheFieldRow[] {
  return rows.map((row) => (row.id === id ? { ...row, lastManualRefreshAt: at } : row));
}

export function cachedFieldCount(rows: CacheFieldRow[]): number {
  return rows.filter((row) => row.cacheEnabled).length;
}

export function scheduledFieldCount(rows: CacheFieldRow[]): number {
  return rows.filter((row) => row.includeInSchedule).length;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Compact relative label for a manual refresh timestamp. */
export function formatRelativeRefresh(at: number | null, now: number): string {
  if (at === null) return 'Never';
  const elapsed = Math.max(0, now - at);
  if (elapsed < 5_000) return 'Just now';
  if (elapsed < MINUTE_MS) return `${Math.floor(elapsed / 1000)}s ago`;
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  return `${Math.floor(elapsed / HOUR_MS)}h ago`;
}

export function defaultCacheSettings(): CacheSettings {
  return {
    dataCacheEnabled: true,
    statisticsCacheEnabled: true,
    scheduleRefreshEnabled: false,
    fields: [],
  };
}

export function parseCacheSettings(raw: string | null): CacheSettings {
  if (!raw) return defaultCacheSettings();
  try {
    const parsed = JSON.parse(raw) as Partial<CacheSettings>;
    const base = defaultCacheSettings();
    return {
      dataCacheEnabled: parsed.dataCacheEnabled ?? base.dataCacheEnabled,
      statisticsCacheEnabled: parsed.statisticsCacheEnabled ?? base.statisticsCacheEnabled,
      scheduleRefreshEnabled: parsed.scheduleRefreshEnabled ?? base.scheduleRefreshEnabled,
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
    };
  } catch {
    return defaultCacheSettings();
  }
}

export function readCanvasFieldOptions(): FieldOption[] {
  if (typeof window === 'undefined') return [];
  const nodes = parseCanvasNodes(window.localStorage.getItem(CANVAS_LAYOUT_STORAGE_KEY));
  return fieldsFromCanvasNodes(nodes);
}

export function useDataSourceCache() {
  const settings: Ref<CacheSettings> = ref(defaultCacheSettings());
  const searchQuery = ref('');

  const visibleFields = computed(() => filterFieldRows(settings.value.fields, searchQuery.value));
  const cachedCount = computed(() => cachedFieldCount(settings.value.fields));
  const scheduledCount = computed(() => scheduledFieldCount(settings.value.fields));

  function persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CACHE_SETTINGS_STORAGE_KEY, JSON.stringify(settings.value));
  }

  function load(): void {
    if (typeof window === 'undefined') return;
    settings.value = parseCacheSettings(window.localStorage.getItem(CACHE_SETTINGS_STORAGE_KEY));
    syncFieldsFromCanvas();
  }

  function syncFieldsFromCanvas(): void {
    settings.value = {
      ...settings.value,
      fields: mergeFieldRows(readCanvasFieldOptions(), settings.value.fields),
    };
  }

  function setDataCacheEnabled(enabled: boolean): void {
    settings.value = { ...settings.value, dataCacheEnabled: enabled };
  }

  function setStatisticsCacheEnabled(enabled: boolean): void {
    settings.value = { ...settings.value, statisticsCacheEnabled: enabled };
  }

  function setScheduleRefreshEnabled(enabled: boolean): void {
    settings.value = { ...settings.value, scheduleRefreshEnabled: enabled };
  }

  function setFieldCache(id: string, enabled: boolean): void {
    settings.value = { ...settings.value, fields: setFieldCacheEnabled(settings.value.fields, id, enabled) };
  }

  function setAllCache(enabled: boolean): void {
    settings.value = { ...settings.value, fields: setAllFieldsCacheEnabled(settings.value.fields, enabled) };
  }

  function setFieldInSchedule(id: string, included: boolean): void {
    settings.value = { ...settings.value, fields: setFieldScheduled(settings.value.fields, id, included) };
  }

  function refreshField(id: string, at: number = Date.now()): void {
    settings.value = { ...settings.value, fields: markFieldRefreshed(settings.value.fields, id, at) };
  }

  watch(settings, persist, { deep: true });

  return {
    settings,
    searchQuery,
    visibleFields,
    cachedCount,
    scheduledCount,
    load,
    syncFieldsFromCanvas,
    setDataCacheEnabled,
    setStatisticsCacheEnabled,
    setScheduleRefreshEnabled,
    setFieldCache,
    setAllCache,
    setFieldInSchedule,
    refreshField,
  };
}
