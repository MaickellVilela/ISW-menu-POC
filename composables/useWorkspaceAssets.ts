import { computed, ref, type Ref } from 'vue';
import type { DataSourceSetup } from '~/composables/useDataSourceFlow';
import { connectorKeyForType, type ConnectorKey } from '~/composables/connectorIcons';

/** Data sources today; visuals and dashboards land in the same list later. */
export type AssetKind = 'data-source' | 'visual' | 'dashboard';

export interface WorkspaceAsset {
  id: string;
  name: string;
  kind: AssetKind;
  /** Origin summary shown under the name. */
  subtitle: string;
  connector: ConnectorKey | null;
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
  };
}

/** Demo seed so the list and the editor are reachable before creating anything. */
const SEEDED_ASSETS: WorkspaceAsset[] = [
  {
    id: 'seed-order-items',
    name: 'Order Item Transaction Detail',
    kind: 'data-source',
    subtitle: 'Marketing data · 2 tables',
    connector: 'postgresql',
  },
  {
    id: 'seed-campaign-costs',
    name: 'Campaign Cost Summary',
    kind: 'data-source',
    subtitle: 'Snowflake · 3 tables',
    connector: 'snowflake',
  },
];

let assetCounter = 0;
function nextAssetId(): string {
  assetCounter += 1;
  return `asset-${assetCounter}`;
}

export function useWorkspaceAssets() {
  const assets: Ref<WorkspaceAsset[]> = ref([...SEEDED_ASSETS]);
  const openAssetId = ref<string | null>(null);

  const isEditorOpen = computed(() => openAssetId.value !== null);
  const openAsset = computed(
    () => assets.value.find((asset) => asset.id === openAssetId.value) ?? null,
  );

  function openEditor(id: string): void {
    if (!assets.value.some((asset) => asset.id === id)) return;
    openAssetId.value = id;
  }

  function closeEditor(): void {
    openAssetId.value = null;
  }

  /** Adds a source produced by the agent and opens it in the editor. */
  function addFromSetup(setup: DataSourceSetup): WorkspaceAsset {
    const asset = assetFromSetup(nextAssetId(), setup);
    assets.value = [asset, ...assets.value];
    openAssetId.value = asset.id;
    return asset;
  }

  return {
    assets,
    openAssetId,
    openAsset,
    isEditorOpen,
    openEditor,
    closeEditor,
    addFromSetup,
  };
}
