<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  DATA_SOURCE_CONNECTIONS,
  DATA_SOURCE_FILES,
  createDataSourceFile,
  entitiesForConnection,
  type DataSourceConnection,
  type DataSourceFile,
} from '~/composables/dataSourceCatalog';
import ConnectionEntitiesPanel from './ConnectionEntitiesPanel.vue';
import ConnectionList from './ConnectionList.vue';
import SourceFilesPanel from './SourceFilesPanel.vue';

type SourcePanelTab = 'connections' | 'files';

const props = withDefaults(
  defineProps<{
    connections?: DataSourceConnection[];
    initialFiles?: DataSourceFile[];
  }>(),
  {
    connections: () => DATA_SOURCE_CONNECTIONS,
    initialFiles: () => DATA_SOURCE_FILES,
  },
);

const emit = defineEmits<{
  'connection-selected': [connection: DataSourceConnection];
  'file-uploaded': [file: DataSourceFile];
  'file-removed': [id: string];
}>();

const activeTab = ref<SourcePanelTab>('connections');
const selectedConnection = ref<DataSourceConnection | null>(null);
const files = ref<DataSourceFile[]>(props.initialFiles.map((file) => ({
  ...file,
  sourceItem: {
    ...file.sourceItem,
    fields: file.sourceItem.fields.map((field) => ({ ...field })),
  },
})));

const selectedEntities = computed(() =>
  selectedConnection.value ? entitiesForConnection(selectedConnection.value) : [],
);

function selectTab(tab: SourcePanelTab): void {
  activeTab.value = tab;
}

function selectConnection(connection: DataSourceConnection): void {
  selectedConnection.value = connection;
  emit('connection-selected', connection);
}

function returnToConnections(): void {
  selectedConnection.value = null;
}

function addFile(file: File): void {
  const sourceFile = createDataSourceFile(
    `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file.name,
  );
  files.value = [sourceFile, ...files.value];
  emit('file-uploaded', sourceFile);
}

function removeFile(id: string): void {
  files.value = files.value.filter((file) => file.id !== id);
  emit('file-removed', id);
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

    <div class="min-h-0 flex-1">
      <template v-if="activeTab === 'connections'">
        <ConnectionEntitiesPanel
          v-if="selectedConnection"
          :connection="selectedConnection"
          :entities="selectedEntities"
          @back="returnToConnections"
        />
        <ConnectionList
          v-else
          :connections="connections"
          @select="selectConnection"
        />
      </template>

      <SourceFilesPanel
        v-else
        :files="files"
        @remove="removeFile"
        @upload="addFile"
      />
    </div>
  </div>
</template>
