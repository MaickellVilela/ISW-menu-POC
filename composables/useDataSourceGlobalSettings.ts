import { ref, watch, type Ref } from 'vue';

export const GLOBAL_SETTINGS_STORAGE_KEY = 'datasource-global-settings-v1';

export const TIME_ATTRIBUTES = [
  'Claim Date (UTC)',
  'Created Date (UTC)',
  'Updated Date (UTC)',
] as const;

export const TIME_RANGE_STARTS = [
  'Start of Data Set',
  'End of Data Set - 1 Day(s)',
  'End of Data Set - 1 Week(s)',
  'End of Data Set - 1 Month(s)',
] as const;

export const TIME_RANGE_ENDS = ['End of Data Set', 'Now'] as const;
export const TILE_PROVIDERS = ['N/A', 'OpenStreetMap', 'Mapbox'] as const;
export const COUNTRY_FORMATS = ['Long Name', 'Short Name', 'ISO 2-letter', 'ISO 3-letter'] as const;
export const NUMBER_FILTER_OPERATORS = [
  'Between',
  'Not Between',
  'Equal',
  'Not Equal',
  'Greater Than',
  'Greater Than or Equal',
  'Less Than',
  'Less Than or Equal',
  'Include',
  'Exclude',
] as const;
export const ATTRIBUTE_FILTER_OPERATORS = ['Equal', 'Not Equal', 'Include', 'Exclude'] as const;
export const TIME_FILTER_OPERATORS = [
  'Between',
  'Not Between',
  'Equal',
  'Not Equal',
  'Before',
  'Before or Equal',
  'After',
  'After or Equal',
  'Include',
  'Exclude',
] as const;
export const FILTER_OPERATORS = [
  ...NUMBER_FILTER_OPERATORS,
  'Before',
  'Before or Equal',
  'After',
  'After or Equal',
] as const;

export type FilterFieldType = 'attribute' | 'number' | 'time';
export type FilterLogicalOperator = 'AND' | 'OR';
export type GlobalFilterOperator = (typeof FILTER_OPERATORS)[number];

export interface TimeBarSettings {
  enabled: boolean;
  defaultAttribute: string;
  playbackEnabled: boolean;
  rangeStart: string;
  rangeEnd: string;
  liveModeEnabled: boolean;
  preferSharpening: boolean;
  maxQueries: number;
}

export interface MapLocaleSettings {
  tileProvider: string;
  apiKey: string;
  countryFormat: string;
}

export interface GlobalFilter {
  id: string;
  field: string;
  fieldLabel: string;
  fieldType: FilterFieldType;
  operator: GlobalFilterOperator;
  values: string[];
}

export interface GlobalFilterDraft {
  field: string;
  fieldLabel: string;
  fieldType: FilterFieldType;
  operator: GlobalFilterOperator;
  values: string[];
}

export interface FilterNesting {
  enabled: boolean;
  operator: FilterLogicalOperator;
  filterIds: string[];
}

export interface DataSourceGlobalSettings {
  timeBar: TimeBarSettings;
  mapLocale: MapLocaleSettings;
  filters: GlobalFilter[];
  filterNesting: FilterNesting;
}

export function defaultGlobalSettings(): DataSourceGlobalSettings {
  return {
    timeBar: {
      enabled: true,
      defaultAttribute: TIME_ATTRIBUTES[0],
      playbackEnabled: false,
      rangeStart: 'End of Data Set - 1 Week(s)',
      rangeEnd: 'End of Data Set',
      liveModeEnabled: false,
      preferSharpening: false,
      maxQueries: 10,
    },
    mapLocale: {
      tileProvider: TILE_PROVIDERS[0],
      apiKey: '',
      countryFormat: COUNTRY_FORMATS[0],
    },
    filters: [],
    filterNesting: {
      enabled: false,
      operator: 'OR',
      filterIds: [],
    },
  };
}

export function createGlobalFilter(id: string, draft: GlobalFilterDraft): GlobalFilter {
  return { id, ...draft, values: [...draft.values] };
}

export function normalizeFilterFieldType(type: string): FilterFieldType {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'number' || normalized === 'numeric') return 'number';
  if (normalized === 'time' || normalized === 'date' || normalized === 'datetime') return 'time';
  return 'attribute';
}

export function filterFieldDisplayName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function operatorsForFilterType(type: FilterFieldType): readonly GlobalFilterOperator[] {
  if (type === 'number') return NUMBER_FILTER_OPERATORS;
  if (type === 'time') return TIME_FILTER_OPERATORS;
  return ATTRIBUTE_FILTER_OPERATORS;
}

export function defaultOperatorForFilterType(type: FilterFieldType): GlobalFilterOperator {
  return type === 'attribute' ? 'Equal' : 'Between';
}

export function filterUsesRange(operator: GlobalFilterOperator): boolean {
  return operator === 'Between' || operator === 'Not Between';
}

export function filterValueSummary(filter: Pick<GlobalFilter, 'operator' | 'values'>): string {
  const values = filter.values.filter(Boolean);
  if (values.length === 0) return 'No value selected';
  if (filterUsesRange(filter.operator) && values.length > 1) {
    return `${values[0]} to ${values[1]}`;
  }
  return values.join(', ');
}

export function addNestedFilterId(filterIds: string[], id: string): string[] {
  return filterIds.includes(id) ? filterIds : [...filterIds, id];
}

export function removeNestedFilterId(filterIds: string[], id: string): string[] {
  return filterIds.filter((filterId) => filterId !== id);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function maxQueriesValue(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(20, Math.max(2, Math.round(value)));
}

function filterOperator(value: unknown, fieldType: FilterFieldType): GlobalFilterOperator {
  const legacyOperators: Record<string, GlobalFilterOperator> = {
    is: 'Equal',
    'is not': 'Not Equal',
    contains: 'Include',
  };
  const normalized = typeof value === 'string' ? legacyOperators[value] ?? value : '';
  return FILTER_OPERATORS.includes(normalized as GlobalFilterOperator)
    ? (normalized as GlobalFilterOperator)
    : defaultOperatorForFilterType(fieldType);
}

function filterFieldLabel(field: string): string {
  const name = field.split('.').pop() ?? field;
  return filterFieldDisplayName(name);
}

function filterValues(filter: Partial<GlobalFilter> & { value?: unknown }): string[] {
  if (Array.isArray(filter.values)) {
    return filter.values.filter((value): value is string => typeof value === 'string');
  }
  return typeof filter.value === 'string' && filter.value ? [filter.value] : [];
}

function parseFilters(value: unknown): GlobalFilter[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const filter = candidate as Partial<GlobalFilter> & { value?: unknown };
    const field = stringValue(filter.field, '');
    if (!field) return [];
    const fieldType = normalizeFilterFieldType(stringValue(filter.fieldType, 'attribute'));
    return [{
      id: stringValue(filter.id, `saved-filter-${index}`),
      field,
      fieldLabel: stringValue(filter.fieldLabel, filterFieldLabel(field)),
      fieldType,
      operator: filterOperator(filter.operator, fieldType),
      values: filterValues(filter),
    }];
  });
}

function parseFilterNesting(value: unknown, filters: GlobalFilter[]): FilterNesting {
  const fallback = defaultGlobalSettings().filterNesting;
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<FilterNesting>;
  const validFilterIds = new Set(filters.map((filter) => filter.id));
  const filterIds = Array.isArray(candidate.filterIds)
    ? candidate.filterIds.filter(
      (id): id is string => typeof id === 'string' && validFilterIds.has(id),
    )
    : [];

  return {
    enabled: booleanValue(candidate.enabled, fallback.enabled),
    operator: candidate.operator === 'AND' || candidate.operator === 'OR'
      ? candidate.operator
      : fallback.operator,
    filterIds,
  };
}

export function parseGlobalSettings(raw: string | null): DataSourceGlobalSettings {
  const fallback = defaultGlobalSettings();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<DataSourceGlobalSettings>;
    const timeBar: Partial<TimeBarSettings> = parsed.timeBar ?? {};
    const mapLocale: Partial<MapLocaleSettings> = parsed.mapLocale ?? {};
    const filters = parseFilters(parsed.filters);

    return {
      timeBar: {
        enabled: booleanValue(timeBar.enabled, fallback.timeBar.enabled),
        defaultAttribute: stringValue(timeBar.defaultAttribute, fallback.timeBar.defaultAttribute),
        playbackEnabled: booleanValue(timeBar.playbackEnabled, fallback.timeBar.playbackEnabled),
        rangeStart: stringValue(timeBar.rangeStart, fallback.timeBar.rangeStart),
        rangeEnd: stringValue(timeBar.rangeEnd, fallback.timeBar.rangeEnd),
        liveModeEnabled: booleanValue(timeBar.liveModeEnabled, fallback.timeBar.liveModeEnabled),
        preferSharpening: booleanValue(timeBar.preferSharpening, fallback.timeBar.preferSharpening),
        maxQueries: maxQueriesValue(timeBar.maxQueries, fallback.timeBar.maxQueries),
      },
      mapLocale: {
        tileProvider: stringValue(mapLocale.tileProvider, fallback.mapLocale.tileProvider),
        apiKey: stringValue(mapLocale.apiKey, fallback.mapLocale.apiKey),
        countryFormat: stringValue(mapLocale.countryFormat, fallback.mapLocale.countryFormat),
      },
      filters,
      filterNesting: parseFilterNesting(parsed.filterNesting, filters),
    };
  } catch {
    return fallback;
  }
}

function uniqueFilterId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useDataSourceGlobalSettings() {
  const settings: Ref<DataSourceGlobalSettings> = ref(defaultGlobalSettings());

  function persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings.value));
  }

  function load(): void {
    if (typeof window === 'undefined') return;
    settings.value = parseGlobalSettings(
      window.localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY),
    );
  }

  function addFilter(draft: GlobalFilterDraft): void {
    settings.value.filters = [
      ...settings.value.filters,
      createGlobalFilter(uniqueFilterId(), draft),
    ];
  }

  function updateFilter(filter: GlobalFilter): void {
    settings.value.filters = settings.value.filters.map((candidate) =>
      candidate.id === filter.id ? filter : candidate,
    );
  }

  function removeFilter(id: string): void {
    settings.value.filters = settings.value.filters.filter((filter) => filter.id !== id);
    settings.value.filterNesting = {
      ...settings.value.filterNesting,
      filterIds: removeNestedFilterId(settings.value.filterNesting.filterIds, id),
    };
  }

  function setFilterNestingEnabled(enabled: boolean): void {
    settings.value.filterNesting = {
      ...settings.value.filterNesting,
      enabled,
      filterIds: enabled ? settings.value.filterNesting.filterIds : [],
    };
  }

  function setNestedFilterOperator(operator: FilterLogicalOperator): void {
    settings.value.filterNesting = { ...settings.value.filterNesting, operator };
  }

  function moveFilterToNested(id: string): void {
    settings.value.filterNesting = {
      ...settings.value.filterNesting,
      enabled: true,
      filterIds: addNestedFilterId(settings.value.filterNesting.filterIds, id),
    };
  }

  function moveFilterToRoot(id: string): void {
    settings.value.filterNesting = {
      ...settings.value.filterNesting,
      filterIds: removeNestedFilterId(settings.value.filterNesting.filterIds, id),
    };
  }

  watch(settings, persist, { deep: true });

  return {
    settings,
    load,
    addFilter,
    updateFilter,
    removeFilter,
    setFilterNestingEnabled,
    setNestedFilterOperator,
    moveFilterToNested,
    moveFilterToRoot,
  };
}
