<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DATA_SOURCE_CONNECTIONS,
  DATA_SOURCE_FILES,
  addCustomSqlQuery,
  connectionUsesSchemas,
  createCustomSqlSourceItem,
  createDataSourceFile,
  entitiesForConnection,
  entitiesForConnectionSchema,
  entityCatalogSelectionId,
  parseCatalogSourceId,
  schemaNameForEntity,
  schemasForConnection,
  type DataSourceConnection,
  type DataSourceFile,
  type SourceCatalogSelection,
} from '~/composables/dataSourceCatalog';
import type { ConnectionSchema } from '~/composables/dataSourceEntities';
import type { SourceItem } from '~/composables/useDataSourceCanvas';
import ConnectionEntitiesPanel from './ConnectionEntitiesPanel.vue';
import ConnectionList from './ConnectionList.vue';
import ConnectionSchemasPanel from './ConnectionSchemasPanel.vue';
import CustomSqlModal from './CustomSqlModal.vue';
import SourceFilesPanel from './SourceFilesPanel.vue';

type SourcePanelTab = 'connections' | 'files';

const props = withDefaults(
  defineProps<{
    connections?: DataSourceConnection[];
    initialFiles?: DataSourceFile[];
    mode?: 'drag' | 'select';
    selectedSourceId?: string;
    usedTableIdentities?: string[];
  }>(),
  {
    connections: () => DATA_SOURCE_CONNECTIONS,
    initialFiles: () => DATA_SOURCE_FILES,
    mode: 'drag',
    selectedSourceId: '',
    usedTableIdentities: () => [],
  },
);

const emit = defineEmits<{
  'connection-selected': [connection: DataSourceConnection];
  'file-uploaded': [file: DataSourceFile];
  'file-removed': [id: string];
  'source-selected': [selection: SourceCatalogSelection];
}>();

const activeTab = ref<SourcePanelTab>('connections');
const selectedConnection = ref<DataSourceConnection | null>(null);
const selectedSchema = ref<ConnectionSchema | null>(null);
const catalogSearchQuery = ref('');
const catalogRevision = ref(0);
const showCustomSql = ref(false);
const files = ref<DataSourceFile[]>(props.initialFiles.map((file) => ({
  ...file,
  sourceItem: {
    ...file.sourceItem,
    fields: file.sourceItem.fields.map((field) => ({ ...field })),
  },
})));

function applySelectedSourceId(sourceId: string): void {
  const parsed = parseCatalogSourceId(sourceId);
  if (!parsed) return;
  if (parsed.kind === 'file') {
    activeTab.value = 'files';
    return;
  }
  const connection = props.connections.find((item) => item.id === parsed.connectionId);
  if (!connection) return;
  activeTab.value = 'connections';
  selectedConnection.value = connection;
  const schemaName = schemaNameForEntity(connection, parsed.entityKey);
  selectedSchema.value = schemaName
    ? schemasForConnection(connection).find((schema) => schema.name === schemaName) ?? null
    : null;
  catalogSearchQuery.value = '';
}

watch(
  () => props.selectedSourceId,
  (sourceId) => applySelectedSourceId(sourceId),
  { immediate: true },
);

const selectedEntities = computed(() => {
  void catalogRevision.value;
  if (!selectedConnection.value) return [];
  if (selectedSchema.value) {
    return entitiesForConnectionSchema(selectedConnection.value, selectedSchema.value.name);
  }
  return entitiesForConnection(selectedConnection.value);
});
const selectedEntityKey = computed(() => {
  if (!selectedConnection.value) return '';
  const selected = selectedEntities.value.find((entity) =>
    entityCatalogSelectionId(selectedConnection.value!.id, entity.key) === props.selectedSourceId,
  );
  return selected?.key ?? '';
});
const selectedFileId = computed(() => {
  const parsed = parseCatalogSourceId(props.selectedSourceId);
  return parsed?.kind === 'file' ? parsed.fileId : '';
});

function selectTab(tab: SourcePanelTab): void {
  activeTab.value = tab;
}

function selectConnection(connection: DataSourceConnection): void {
  selectedConnection.value = connection;
  selectedSchema.value = null;
  catalogSearchQuery.value = '';
  emit('connection-selected', connection);
}

function selectSchema(schema: ConnectionSchema): void {
  selectedSchema.value = schema;
  catalogSearchQuery.value = '';
}

function returnToConnections(): void {
  selectedConnection.value = null;
  selectedSchema.value = null;
  catalogSearchQuery.value = '';
}

function returnToSchemas(): void {
  selectedSchema.value = null;
  catalogSearchQuery.value = '';
}

function selectEntity(sourceItem: SourceItem): void {
  if (!selectedConnection.value) return;
  emit('source-selected', {
    kind: 'entity',
    connection: selectedConnection.value,
    sourceItem,
  });
}

function selectFile(file: DataSourceFile): void {
  emit('source-selected', {
    kind: 'file',
    file,
    sourceItem: file.sourceItem,
  });
}

function addFile(file: File): void {
  const sourceFile = createDataSourceFile(
    `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file.name,
  );
  files.value = [sourceFile, ...files.value];
  emit('file-uploaded', sourceFile);
  if (props.mode === 'select') selectFile(sourceFile);
}

function removeFile(id: string): void {
  files.value = files.value.filter((file) => file.id !== id);
  emit('file-removed', id);
}

function schemaForNewQuery(connection: DataSourceConnection): ConnectionSchema | null {
  if (selectedConnection.value?.id === connection.id && selectedSchema.value) {
    return selectedSchema.value;
  }
  if (!connectionUsesSchemas(connection)) return null;
  return schemasForConnection(connection)[0] ?? null;
}

function saveCustomSql(payload: { connection: DataSourceConnection; name: string; sql: string }): void {
  const schema = schemaForNewQuery(payload.connection);
  const sourceItem = createCustomSqlSourceItem(payload.name, payload.sql);
  addCustomSqlQuery({
    connectionId: payload.connection.id,
    schemaName: schema?.name ?? '',
    sql: payload.sql,
    sourceItem,
  });
  catalogRevision.value += 1;
  catalogSearchQuery.value = '';
  showCustomSql.value = false;
  selectedConnection.value = payload.connection;
  selectedSchema.value = schema;
  activeTab.value = 'connections';
  if (props.mode === 'select') selectEntity(sourceItem);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <nav class="flex h-12 flex-shrink-0 items-end border-b border-[#E2E2E2] px-3" aria-label="Source browser">
      <button
        type="button"
        class="-mb-px flex h-full flex-1 items-center justify-center gap-2 border-b-2 px-2 text-xs transition-colors"
        :class="
          activeTab === 'connections'
            ? 'border-[#3B1770] font-semibold text-[#25262E]'
            : 'border-transparent text-[#7A7A7A] hover:text-[#25262E]'
        "
        :aria-current="activeTab === 'connections' ? 'page' : undefined"
        @click="selectTab('connections')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M13 18V20H19V22H13C11.8954 22 11 21.1046 11 20V18H8C5.79086 18 4 16.2091 4 14V7C4 6.44772 4.44772 6 5 6H8V2H10V6H14V2H16V6H19C19.5523 6 20 6.44772 20 7V14C20 16.2091 18.2091 18 16 18H13ZM8 16H16C17.1046 16 18 15.1046 18 14V11H6V14C6 15.1046 6.89543 16 8 16ZM18 8H6V9H18V8ZM12 14.5C11.4477 14.5 11 14.0523 11 13.5C11 12.9477 11.4477 12.5 12 12.5C12.5523 12.5 13 12.9477 13 13.5C13 14.0523 12.5523 14.5 12 14.5Z" />
        </svg>
        Connections
      </button>
      <button
        type="button"
        class="-mb-px flex h-full flex-1 items-center justify-center gap-2 border-b-2 px-2 text-xs transition-colors"
        :class="
          activeTab === 'files'
            ? 'border-[#3B1770] font-semibold text-[#25262E]'
            : 'border-transparent text-[#7A7A7A] hover:text-[#25262E]'
        "
        :aria-current="activeTab === 'files' ? 'page' : undefined"
        @click="selectTab('files')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9ZM8 7H11V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z" />
        </svg>
        Files
      </button>
    </nav>

    <div class="flex min-h-0 flex-1 flex-col">
      <template v-if="activeTab === 'connections'">
        <div class="min-h-0 flex-1">
          <ConnectionEntitiesPanel
            v-if="selectedConnection && (selectedSchema || !connectionUsesSchemas(selectedConnection))"
            :connection="selectedConnection"
            :entities="selectedEntities"
            :mode="mode"
            :selected-key="selectedEntityKey"
            :search-query="catalogSearchQuery"
            :used-table-identities="usedTableIdentities"
            :schema-name="selectedSchema?.name ?? ''"
            :back-label="selectedSchema ? 'Schemas' : 'Connections'"
            :catalog-revision="catalogRevision"
            @back="selectedSchema ? returnToSchemas() : returnToConnections()"
            @select="selectEntity"
            @update:search-query="catalogSearchQuery = $event"
          />
          <ConnectionSchemasPanel
            v-else-if="selectedConnection"
            :connection="selectedConnection"
            :search-query="catalogSearchQuery"
            :used-table-identities="usedTableIdentities"
            :catalog-revision="catalogRevision"
            @back="returnToConnections"
            @select="selectSchema"
            @update:search-query="catalogSearchQuery = $event"
          />
          <ConnectionList
            v-else
            :connections="connections"
            :search-query="catalogSearchQuery"
            :used-table-identities="usedTableIdentities"
            :catalog-revision="catalogRevision"
            @select="selectConnection"
            @update:search-query="catalogSearchQuery = $event"
          />
        </div>
        <div class="flex-shrink-0 border-t border-[#E2E2E2] bg-white p-2">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-md border border-[#D8D8D8] bg-white px-3 py-2 text-xs font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:bg-[#F8F6FC] hover:text-[#3B1770]"
            @click="showCustomSql = true"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 7h14M5 12h9M5 17h11" stroke-linecap="round" />
            </svg>
            Custom SQL
          </button>
        </div>
      </template>

      <SourceFilesPanel
        v-else
        :files="files"
        :mode="mode"
        :selected-file-id="selectedFileId"
        @remove="removeFile"
        @select="selectFile"
        @upload="addFile"
      />
    </div>

    <CustomSqlModal
      :open="showCustomSql"
      :connections="connections"
      :selected-connection-id="selectedConnection?.id ?? ''"
      @cancel="showCustomSql = false"
      @save="saveCustomSql"
    />
  </div>
</template>
