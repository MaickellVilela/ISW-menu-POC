import { computed, ref, type Ref } from 'vue';
import type { DataSourceSetup } from '~/composables/useDataSourceFlow';
import { connectorKeyForType, type ConnectorKey } from '~/composables/connectorIcons';

/** Data sources today; visuals and dashboards land in the same list later. */
export type AssetKind = 'data-source' | 'visual' | 'dashboard';

/** How the asset entered the workspace. */
export type AssetOrigin = 'generated' | 'imported';

export type AssetSortKey = 'name' | 'modifiedAt' | 'author';

export type ContextAttachmentKind = 'image' | 'pdf';

/** Chat / use-case files attached as context — not inventory sources. */
export interface ContextAttachment {
  id: string;
  name: string;
  kind: ContextAttachmentKind;
}

export type ArtifactSectionId = 'context' | 'imported' | 'generated';

/** Shown on empty sections, and as a tooltip once the section has items. */
export const ARTIFACT_SECTION_HELP: Record<ArtifactSectionId, string> = {
  context:
    'Files attached in the data source wizard. They give the agent extra context for this workspace.',
  imported:
    'Existing data sources brought in from inventory so you can work over them here.',
  generated:
    'Data sources created in this workspace with the wizard or the agent.',
};

/** Preview keeps the agent available; edit hides it until the source is saved. */
export type SourceViewMode = 'preview' | 'edit';

export function isAgentAvailable(mode: SourceViewMode | null): boolean {
  return mode !== 'edit';
}

/** Secondary banner action: leave without saving. Label depends on whether the source was changed. */
export function editorExitLabel(hasUnsavedChanges: boolean): string {
  return hasUnsavedChanges ? 'Discard changes' : 'Back to agent';
}

export interface WorkspaceAsset {
  id: string;
  name: string;
  kind: AssetKind;
  /** Origin summary shown under the name (connection · tables). */
  subtitle: string;
  connector: ConnectorKey | null;
  author: string;
  /** ISO timestamp used for sort and display. */
  modifiedAt: string;
  tags: string[];
  origin: AssetOrigin;
}

/** Catalog row the user can import into a workspace (inventory POC). */
export interface ImportableSource {
  id: string;
  name: string;
  subtitle: string;
  connector: ConnectorKey;
  author: string;
  modifiedAt: string;
  tags: string[];
}

// --- Pure helpers ---

function titleize(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Names a new source after its primary table, e.g. "Marketing Campaigns". */
export function buildDataSourceName(setup: DataSourceSetup): string {
  const [first] = setup.tableConfig.tables;
  return first ? titleize(first) : setup.connection.name;
}

export function buildDataSourceSubtitle(setup: DataSourceSetup): string {
  const count = setup.tableConfig.tables.length;
  const noun = count === 1 ? 'table' : 'tables';
  return `${setup.connection.name} · ${count} ${noun}`;
}

export function assetFromSetup(id: string, setup: DataSourceSetup): WorkspaceAsset {
  return {
    id,
    name: buildDataSourceName(setup),
    kind: 'data-source',
    subtitle: buildDataSourceSubtitle(setup),
    connector: connectorKeyForType(setup.connection.type),
    author: 'you',
    modifiedAt: new Date().toISOString(),
    tags: ['generated'],
    origin: 'generated',
  };
}

export function assetFromImportable(id: string, source: ImportableSource): WorkspaceAsset {
  return {
    id,
    name: source.name,
    kind: 'data-source',
    subtitle: source.subtitle,
    connector: source.connector,
    author: source.author,
    modifiedAt: new Date().toISOString(),
    tags: [...source.tags, 'imported'],
    origin: 'imported',
  };
}

/** Wizard files are pdf or treated as images for this POC. */
export function kindFromFileName(fileName: string): ContextAttachmentKind {
  return fileName.trim().toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

/** Case-insensitive match on name, subtitle, author, or tags. */
export function filterAssetsByQuery(assets: WorkspaceAsset[], query: string): WorkspaceAsset[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return assets;

  return assets.filter((asset) => {
    const haystack = [asset.name, asset.subtitle, asset.author, ...asset.tags]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function sortAssets(
  assets: WorkspaceAsset[],
  sortKey: AssetSortKey,
  direction: 'asc' | 'desc' = 'desc',
): WorkspaceAsset[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...assets].sort((a, b) => {
    const left = a[sortKey];
    const right = b[sortKey];
    if (left < right) return -1 * factor;
    if (left > right) return 1 * factor;
    return 0;
  });
}

export function formatAssetModifiedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Splits source assets into the Artifacts panel sections. */
export function partitionSourceAssets(assets: WorkspaceAsset[]): {
  imported: WorkspaceAsset[];
  generated: WorkspaceAsset[];
} {
  const imported: WorkspaceAsset[] = [];
  const generated: WorkspaceAsset[] = [];

  for (const asset of assets) {
    if (asset.origin === 'imported') imported.push(asset);
    else generated.push(asset);
  }

  return { imported, generated };
}

/** True when at least one selected id is a publishable source (not a context file). */
export function hasSelectedSources(selectedIds: string[], assets: WorkspaceAsset[]): boolean {
  if (!selectedIds.length) return false;
  const sourceIds = new Set(assets.map((asset) => asset.id));
  return selectedIds.some((id) => sourceIds.has(id));
}

/** Demo inventory catalog — sources that already exist outside the workspace. */
export const IMPORTABLE_SOURCES: ImportableSource[] = [
  {
    id: 'inv-claim-nulls',
    name: 'Claim Nulls',
    subtitle: 'Supabase Samples · 1 table',
    connector: 'postgresql',
    author: 'evelyn.chou',
    modifiedAt: '2026-06-29T08:24:00.000Z',
    tags: [],
  },
  {
    id: 'inv-store-network',
    name: 'Store Network Geo',
    subtitle: 'PostgreSQL-RDS · 2 tables',
    connector: 'postgresql',
    author: 'arpita.jain',
    modifiedAt: '2026-04-29T09:38:00.000Z',
    tags: ['Location'],
  },
  {
    id: 'inv-campaign-cost',
    name: 'Campaign Cost',
    subtitle: 'Snowflake - Logi · 3 tables',
    connector: 'snowflake',
    author: 'arpita.jain',
    modifiedAt: '2026-04-14T14:02:00.000Z',
    tags: [],
  },
  {
    id: 'inv-ml-model',
    name: 'Customer Churn Scores',
    subtitle: 'Python · 1 table',
    connector: 'python',
    author: 'terrence.sheflin',
    modifiedAt: '2026-03-02T11:15:00.000Z',
    tags: ['ML Model'],
  },
];

/** Demo seed so the list and the editor are reachable before creating anything. */
const SEEDED_ASSETS: WorkspaceAsset[] = [
  {
    id: 'seed-order-items',
    name: 'Order Item Transaction Detail',
    kind: 'data-source',
    subtitle: 'Marketing data · 2 tables',
    connector: 'postgresql',
    author: 'you',
    modifiedAt: '2026-08-05T14:20:00.000Z',
    tags: ['generated'],
    origin: 'generated',
  },
  {
    id: 'seed-campaign-costs',
    name: 'Campaign Cost Summary',
    kind: 'data-source',
    subtitle: 'Snowflake · 3 tables',
    connector: 'snowflake',
    author: 'you',
    modifiedAt: '2026-08-04T09:10:00.000Z',
    tags: ['generated'],
    origin: 'generated',
  },
];

/** Demo context files attached from the business case / chat. */
const SEEDED_ATTACHMENTS: ContextAttachment[] = [
  { id: 'ctx-brief-png', name: 'campaign-brief.png', kind: 'image' },
  { id: 'ctx-requirements-pdf', name: 'requirements.pdf', kind: 'pdf' },
];

let assetCounter = 0;
function nextAssetId(): string {
  assetCounter += 1;
  return `asset-${assetCounter}`;
}

export interface UseWorkspaceAssetsOptions {
  /** When false, start with no attachments or sources (new workspace empty state). */
  seedDemoData?: boolean;
}

export function useWorkspaceAssets(options: UseWorkspaceAssetsOptions = {}) {
  const seedDemoData = options.seedDemoData !== false;
  const assets: Ref<WorkspaceAsset[]> = ref(seedDemoData ? [...SEEDED_ASSETS] : []);
  const attachments: Ref<ContextAttachment[]> = ref(seedDemoData ? [...SEEDED_ATTACHMENTS] : []);
  const openAssetId = ref<string | null>(null);
  const selectedIds = ref<string[]>([]);
  const viewMode = ref<SourceViewMode | null>(null);

  const isEditorOpen = computed(() => openAssetId.value !== null);
  const isEditingSource = computed(() => viewMode.value === 'edit');
  const sourceViewMode = computed<SourceViewMode>(() => viewMode.value ?? 'preview');
  const openAsset = computed(
    () => assets.value.find((asset) => asset.id === openAssetId.value) ?? null,
  );
  const artifactCount = computed(() => assets.value.length + attachments.value.length);
  const canPublish = computed(() => hasSelectedSources(selectedIds.value, assets.value));

  /** Opens a source in preview so the agent stays available. Ignored while editing. */
  function openEditor(id: string): void {
    if (viewMode.value === 'edit') return;
    if (!assets.value.some((asset) => asset.id === id)) return;
    openAssetId.value = id;
    viewMode.value = 'preview';
  }

  function closeEditor(): void {
    openAssetId.value = null;
    viewMode.value = null;
  }

  function startEdit(): void {
    if (!openAssetId.value) return;
    viewMode.value = 'edit';
  }

  function saveEdits(): boolean {
    if (viewMode.value !== 'edit' || !openAssetId.value) return false;
    touchAsset(openAssetId.value);
    viewMode.value = 'preview';
    return true;
  }

  /** Leaves edit mode without persisting. Unsaved canvas changes are dropped. */
  function endEditing(): boolean {
    if (viewMode.value !== 'edit' || !openAssetId.value) return false;
    viewMode.value = 'preview';
    return true;
  }

  function touchAsset(id: string): void {
    const index = assets.value.findIndex((asset) => asset.id === id);
    if (index < 0) return;
    const current = assets.value[index];
    assets.value = [
      ...assets.value.slice(0, index),
      { ...current, modifiedAt: new Date().toISOString() },
      ...assets.value.slice(index + 1),
    ];
  }

  /** Adds a source produced by the agent and opens it in preview. */
  function addFromSetup(setup: DataSourceSetup): WorkspaceAsset {
    const asset = assetFromSetup(nextAssetId(), setup);
    assets.value = [asset, ...assets.value];
    openAssetId.value = asset.id;
    viewMode.value = 'preview';
    if (setup.useCase.fileName) {
      addAttachmentFromFileName(setup.useCase.fileName);
    }
    return asset;
  }

  /** Copies a wizard upload into context attachments. */
  function addAttachmentFromFileName(fileName: string): ContextAttachment | null {
    const name = fileName.trim();
    if (!name) return null;
    const attachment: ContextAttachment = {
      id: `ctx-${nextAssetId()}`,
      name,
      kind: kindFromFileName(name),
    };
    attachments.value = [attachment, ...attachments.value];
    return attachment;
  }

  /** Copies an inventory source into the workspace artifacts list. */
  function importFromCatalog(sourceId: string): WorkspaceAsset | null {
    const source = IMPORTABLE_SOURCES.find((item) => item.id === sourceId);
    if (!source) return null;
    if (assets.value.some((asset) => asset.name === source.name && asset.origin === 'imported')) {
      return null;
    }

    const asset = assetFromImportable(nextAssetId(), source);
    assets.value = [asset, ...assets.value];
    return asset;
  }

  function renameAsset(id: string, name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const index = assets.value.findIndex((asset) => asset.id === id);
    if (index < 0) return false;

    const current = assets.value[index];
    assets.value = [
      ...assets.value.slice(0, index),
      { ...current, name: trimmed, modifiedAt: new Date().toISOString() },
      ...assets.value.slice(index + 1),
    ];
    return true;
  }

  function deleteAssets(ids: string[]): void {
    if (!ids.length) return;
    const idSet = new Set(ids);
    assets.value = assets.value.filter((asset) => !idSet.has(asset.id));
    selectedIds.value = selectedIds.value.filter((id) => !idSet.has(id));
    if (openAssetId.value && idSet.has(openAssetId.value)) {
      openAssetId.value = null;
      viewMode.value = null;
    }
  }

  function removeAttachment(id: string): void {
    attachments.value = attachments.value.filter((attachment) => attachment.id !== id);
  }

  function setSelectedIds(ids: string[]): void {
    selectedIds.value = ids.filter((id) => assets.value.some((asset) => asset.id === id));
  }

  function toggleSelected(id: string): void {
    if (!assets.value.some((asset) => asset.id === id)) return;
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id);
      return;
    }
    selectedIds.value = [...selectedIds.value, id];
  }

  return {
    assets,
    attachments,
    openAssetId,
    openAsset,
    selectedIds,
    artifactCount,
    canPublish,
    isEditorOpen,
    isEditingSource,
    sourceViewMode,
    openEditor,
    closeEditor,
    startEdit,
    saveEdits,
    endEditing,
    addFromSetup,
    addAttachmentFromFileName,
    importFromCatalog,
    renameAsset,
    deleteAssets,
    removeAttachment,
    setSelectedIds,
    toggleSelected,
  };
}
