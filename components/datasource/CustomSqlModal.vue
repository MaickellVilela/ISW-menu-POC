<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DATA_SOURCE_CONNECTIONS, type DataSourceConnection } from '~/composables/dataSourceCatalog';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';

const props = withDefaults(
  defineProps<{
    open: boolean;
    connections?: DataSourceConnection[];
    selectedConnectionId?: string;
  }>(),
  {
    connections: () => DATA_SOURCE_CONNECTIONS,
    selectedConnectionId: '',
  },
);

const emit = defineEmits<{
  cancel: [];
  save: [payload: { connection: DataSourceConnection; name: string; sql: string }];
}>();

const connectionId = ref('');
const name = ref('Custom query');
const sql = ref('SELECT id, name\nFROM ');

const selectedConnection = computed(
  () => props.connections.find((connection) => connection.id === connectionId.value) ?? null,
);

const canSave = computed(() =>
  Boolean(selectedConnection.value && name.value.trim() && sql.value.trim()),
);

function reset(): void {
  connectionId.value = props.selectedConnectionId || props.connections[0]?.id || '';
  name.value = 'Custom query';
  const connection = selectedConnection.value;
  sql.value = connection
    ? `SELECT id, name\nFROM ${connection.name.replace(/\s+/g, '_')}`
    : 'SELECT id, name\nFROM ';
}

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <section
        class="flex w-[min(40rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-sql-title"
      >
        <header class="flex items-start justify-between gap-4 border-b border-[#E2E2E2] px-5 py-4">
          <div>
            <h2 id="custom-sql-title" class="text-lg font-semibold text-[#25262E]">Custom SQL</h2>
            <p class="mt-1 text-sm text-[#667085]">
              Write a query that returns a table. It can be used on the canvas like any other entity.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4]"
            aria-label="Close custom SQL"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="space-y-4 px-5 py-4">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-[#52525B]">Connection</span>
            <select
              v-model="connectionId"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            >
              <option v-for="connection in connections" :key="connection.id" :value="connection.id">
                {{ connection.name }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-[#52525B]">Query name</span>
            <input
              v-model="name"
              type="text"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-[#52525B]">SQL</span>
            <textarea
              v-model="sql"
              rows="8"
              spellcheck="false"
              class="w-full rounded-md border border-[#D8D8D8] bg-[#FAFAFA] px-2.5 py-2 font-mono text-xs leading-relaxed text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>

          <p v-if="selectedConnection" class="flex items-center gap-2 text-[11px] text-[#7A7A7A]">
            <img :src="CONNECTOR_ICONS[selectedConnection.connector]" alt="" class="h-4 w-4 object-contain" />
            Resulting table will be available under {{ selectedConnection.name }}.
          </p>
        </div>

        <footer class="flex justify-end gap-2 border-t border-[#E2E2E2] px-5 py-3">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
            :disabled="!canSave"
            @click="selectedConnection && emit('save', { connection: selectedConnection, name: name.trim(), sql: sql.trim() })"
          >
            Add query
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
