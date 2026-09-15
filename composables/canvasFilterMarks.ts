import { fieldOptionFromTableField } from './canvasFilterShortcuts';
import {
  FILTER_VALUE_STORAGE_KEY,
  parseFilterValueConfiguration,
  type FilterValueConfiguration,
} from './useFilterValueConfiguration';
import {
  GLOBAL_SETTINGS_STORAGE_KEY,
  parseGlobalSettings,
  type GlobalFilter,
} from './useDataSourceGlobalSettings';
import type { FieldDef } from './useDataSourceCanvas';

export interface CanvasFilterMarkSnapshot {
  performanceProviderId: string;
  globalFilters: GlobalFilter[];
}

export function emptyCanvasFilterMarks(): CanvasFilterMarkSnapshot {
  return { performanceProviderId: '', globalFilters: [] };
}

export function performanceProviderId(config: FilterValueConfiguration): string {
  return config.provider?.id ?? '';
}

export function tableHasPerformanceFilter(sourceId: string, providerId: string): boolean {
  return Boolean(sourceId && providerId && sourceId === providerId);
}

export function globalFilterForField(
  filters: readonly GlobalFilter[],
  fieldValue: string,
): GlobalFilter | null {
  return filters.find((filter) => filter.field === fieldValue) ?? null;
}

export function outputHasGlobalFilters(filters: readonly GlobalFilter[]): boolean {
  return filters.length > 0;
}

export function filteredFieldIdsForTable(
  entityLabel: string,
  fields: readonly FieldDef[],
  filters: readonly GlobalFilter[],
): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const field of fields) {
    const filter = globalFilterForField(
      filters,
      fieldOptionFromTableField(entityLabel, field).value,
    );
    if (filter) ids[field.name] = filter.id;
  }
  return ids;
}

export function readCanvasFilterMarks(): CanvasFilterMarkSnapshot {
  if (typeof window === 'undefined') return emptyCanvasFilterMarks();
  const configuration = parseFilterValueConfiguration(
    window.localStorage.getItem(FILTER_VALUE_STORAGE_KEY),
  );
  const settings = parseGlobalSettings(
    window.localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY),
  );
  return {
    performanceProviderId: performanceProviderId(configuration),
    globalFilters: settings.filters,
  };
}
