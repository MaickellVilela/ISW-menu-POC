import type { ConnectorKey } from '~/composables/connectorIcons'
import type { ImportableSource, WorkspaceAsset } from '~/composables/useWorkspaceAssets'

export interface PublishNameDraft {
  assetId: string
  name: string
  originalName: string
}

export function normalizeSourceName(name: string): string {
  return name.trim()
}

export function isBlankPublishName(name: string): boolean {
  return normalizeSourceName(name).length === 0
}

export function publishNameKey(name: string): string {
  return normalizeSourceName(name).toLowerCase()
}

export function selectedPublishableAssets(
  selectedIds: string[],
  assets: WorkspaceAsset[],
): WorkspaceAsset[] {
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  return selectedIds
    .map((id) => byId.get(id))
    .filter((asset): asset is WorkspaceAsset => asset != null)
}

export function publishedCatalogNames(catalog: ImportableSource[]): string[] {
  return catalog.map((source) => source.name)
}

/** True when this draft collides with a published name or another draft in the batch. */
export function hasPublishNameConflict(
  draft: PublishNameDraft,
  drafts: PublishNameDraft[],
  publishedNames: string[],
): boolean {
  const key = publishNameKey(draft.name)
  if (!key) return false
  if (publishedNames.some((name) => publishNameKey(name) === key)) return true
  return drafts.some(
    (other) => other.assetId !== draft.assetId && publishNameKey(other.name) === key,
  )
}

/** Next unused "Name", "Name 2", "Name 3" given names that are already taken. */
export function uniquePublishedName(desiredName: string, takenNames: string[]): string {
  const base = normalizeSourceName(desiredName) || 'Untitled data source'
  const taken = new Set(takenNames.map(publishNameKey).filter(Boolean))
  if (!taken.has(publishNameKey(base))) return base

  let suffix = 2
  while (taken.has(publishNameKey(`${base} ${suffix}`))) suffix += 1
  return `${base} ${suffix}`
}

/** Prefills unique copy names so a conflicting selection can still publish. */
export function initialPublishDrafts(
  assets: WorkspaceAsset[],
  publishedNames: string[],
): PublishNameDraft[] {
  const taken = [...publishedNames]
  return assets.map((asset) => {
    const name = uniquePublishedName(asset.name, taken)
    taken.push(name)
    return { assetId: asset.id, originalName: asset.name, name }
  })
}

export function canConfirmPublish(
  drafts: PublishNameDraft[],
  publishedNames: string[],
): boolean {
  if (!drafts.length) return false
  if (drafts.some((draft) => isBlankPublishName(draft.name))) return false
  return drafts.every((draft) => !hasPublishNameConflict(draft, drafts, publishedNames))
}

export function importableFromWorkspaceAsset(
  asset: WorkspaceAsset,
  name: string,
  id: string,
): ImportableSource {
  const connector: ConnectorKey = asset.connector ?? 'postgresql'
  return {
    id,
    name: normalizeSourceName(name),
    subtitle: asset.subtitle,
    connector,
    author: 'you',
    modifiedAt: new Date().toISOString(),
    tags: [],
  }
}
