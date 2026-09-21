import { ref, type Ref } from 'vue';

export const SOURCE_DEFINITION_STORAGE_KEY = 'datasource-source-definition-v1';
export const DEFAULT_SOURCE_NAME = 'Untitled data source';

export interface SourceDefinition {
  name: string;
  description: string;
  tags: string[];
}

export function defaultSourceDefinition(): SourceDefinition {
  return {
    name: DEFAULT_SOURCE_NAME,
    description: '',
    tags: [],
  };
}

export function cloneSourceDefinition(value: SourceDefinition): SourceDefinition {
  return {
    name: value.name,
    description: value.description,
    tags: [...value.tags],
  };
}

export function normalizeSourceDefinitionName(name: string): string {
  return name.trim();
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function addTag(tags: string[], value: string): string[] {
  return uniqueTags([...tags, value]);
}

export function addTags(tags: string[], values: string[]): string[] {
  return uniqueTags([...tags, ...values]);
}

export function removeTag(tags: string[], value: string): string[] {
  const key = normalizeTag(value).toLowerCase();
  return tags.filter((tag) => tag.toLowerCase() !== key);
}

export function tagsFromDraft(draft: string): string[] {
  return uniqueTags(draft.split(','));
}

export function sourceDefinitionsEqual(left: SourceDefinition, right: SourceDefinition): boolean {
  return (
    normalizeSourceDefinitionName(left.name) === normalizeSourceDefinitionName(right.name)
    && left.description.trim() === right.description.trim()
    && uniqueTags(left.tags).join('\u0000') === uniqueTags(right.tags).join('\u0000')
  );
}

export function canSaveSourceDefinition(draft: SourceDefinition, saved: SourceDefinition): boolean {
  if (!normalizeSourceDefinitionName(draft.name)) return false;
  return !sourceDefinitionsEqual(draft, saved);
}

export function sanitizeSourceDefinition(value: Partial<SourceDefinition> | null | undefined): SourceDefinition {
  const fallback = defaultSourceDefinition();
  if (!value) return fallback;
  const name = normalizeSourceDefinitionName(value.name ?? '') || fallback.name;
  const tags = Array.isArray(value.tags)
    ? uniqueTags(value.tags.filter((tag): tag is string => typeof tag === 'string'))
    : [];

  return {
    name,
    description: typeof value.description === 'string' ? value.description : '',
    tags,
  };
}

export function parseSourceDefinition(raw: string | null): SourceDefinition {
  if (!raw) return defaultSourceDefinition();
  try {
    return sanitizeSourceDefinition(JSON.parse(raw) as Partial<SourceDefinition>);
  } catch {
    return defaultSourceDefinition();
  }
}

const definition: Ref<SourceDefinition> = ref(defaultSourceDefinition());

export function useSourceDefinition() {
  function persist(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SOURCE_DEFINITION_STORAGE_KEY, JSON.stringify(definition.value));
  }

  function load(): void {
    if (typeof window === 'undefined') return;
    definition.value = parseSourceDefinition(
      window.localStorage.getItem(SOURCE_DEFINITION_STORAGE_KEY),
    );
  }

  function save(next: SourceDefinition): void {
    definition.value = sanitizeSourceDefinition(next);
    persist();
  }

  return { definition, load, save };
}
