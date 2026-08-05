<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  RECOMMENDED_TABLE_LIMIT,
  type SchemaOption,
  type TableConfigPayload,
} from '~/composables/useDataSourceFlow';

const props = defineProps<{
  schemas: SchemaOption[];
  value: TableConfigPayload;
}>();
const emit = defineEmits<{ 'update:value': [payload: TableConfigPayload] }>();

const schemaSearch = ref('');
const tableSearch = ref('');

const filteredSchemas = computed(() =>
  props.schemas.filter((schema) =>
    schema.name.toLowerCase().includes(schemaSearch.value.trim().toLowerCase()),
  ),
);

const schemaTables = computed(
  () => props.schemas.find((schema) => schema.name === props.value.schema)?.tables ?? [],
);

const filteredTables = computed(() =>
  schemaTables.value.filter((table) =>
    table.toLowerCase().includes(tableSearch.value.trim().toLowerCase()),
  ),
);

const overLimit = computed(() => props.value.tables.length > RECOMMENDED_TABLE_LIMIT);

function isSelected(table: string): boolean {
  return props.value.tables.includes(table);
}

function selectSchema(name: string): void {
  if (props.value.schema === name) return;
  tableSearch.value = '';
  emit('update:value', { schema: name, tables: [] });
}

function toggle(table: string): void {
  const tables = isSelected(table)
    ? props.value.tables.filter((item) => item !== table)
    : [...props.value.tables, table];
  emit('update:value', { ...props.value, tables });
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-[#25262E]">Set Table Configuration</p>
        <p class="mt-1 text-xs text-[#6B6B6B]">Select the tables that the agent should assess.</p>
      </div>
      <span class="flex-shrink-0 text-xs text-[#9A9A9A]">
        Tables Selected: {{ props.value.tables.length }}
      </span>
    </div>

    <div
      class="mt-3 rounded-md border-l-2 px-3 py-2 text-[11px] leading-relaxed"
      :class="overLimit ? 'border-[#B4381F] bg-[#FBEDE9] text-[#B4381F]' : 'border-[#3B1770] bg-[#F5F1FC] text-[#6B6B6B]'"
    >
      Selecting more than {{ RECOMMENDED_TABLE_LIMIT }} tables may impact the agent's assignment and
      require manual adjustments. Use {{ RECOMMENDED_TABLE_LIMIT }} tables or fewer for best results.
    </div>

    <div class="mt-3 grid grid-cols-3 gap-3">
      <!-- Schemas -->
      <div class="rounded-lg border border-[#E2E2E2]">
        <p class="border-b border-[#E2E2E2] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
          Schemas
        </p>
        <div class="h-[200px] overflow-y-auto p-1.5">
          <input
            v-model="schemaSearch"
            type="text"
            placeholder="Search schemas..."
            class="mb-1.5 w-full rounded border border-[#E2E2E2] px-2 py-1 text-xs focus:border-[#3B1770] focus:outline-none"
          />
          <button
            v-for="schema in filteredSchemas"
            :key="schema.name"
            type="button"
            class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors"
            :class="props.value.schema === schema.name ? 'bg-[#F5F1FC] text-[#3B1770]' : 'text-[#25262E] hover:bg-[#F5F5F5]'"
            @click="selectSchema(schema.name)"
          >
            <span class="font-medium">{{ schema.name }}</span>
            <span class="text-[10px] text-[#9A9A9A]">{{ schema.tables.length }}</span>
          </button>
        </div>
      </div>

      <!-- Tables -->
      <div class="rounded-lg border border-[#E2E2E2]">
        <p class="border-b border-[#E2E2E2] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
          Tables
        </p>
        <div class="h-[200px] overflow-y-auto p-1.5">
          <input
            v-model="tableSearch"
            type="text"
            placeholder="Search tables..."
            class="mb-1.5 w-full rounded border border-[#E2E2E2] px-2 py-1 text-xs focus:border-[#3B1770] focus:outline-none"
          />
          <p v-if="!filteredTables.length" class="px-2 py-1.5 text-xs text-[#9A9A9A]">
            No tables are available.
          </p>
          <label
            v-for="table in filteredTables"
            :key="table"
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-[#25262E] transition-colors hover:bg-[#F5F5F5]"
            :class="isSelected(table) ? 'bg-[#F5F1FC]' : ''"
          >
            <input
              type="checkbox"
              class="h-3.5 w-3.5 accent-[#3B1770]"
              :checked="isSelected(table)"
              @change="toggle(table)"
            />
            {{ table }}
          </label>
        </div>
      </div>

      <!-- Selected -->
      <div class="rounded-lg border border-[#E2E2E2]">
        <p class="border-b border-[#E2E2E2] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
          Selected
        </p>
        <div class="h-[200px] overflow-y-auto p-1.5">
          <p v-if="!props.value.tables.length" class="px-2 py-1.5 text-xs text-[#9A9A9A]">
            No tables selected yet.
          </p>
          <div
            v-for="table in props.value.tables"
            :key="table"
            class="flex items-center justify-between rounded px-2 py-1.5 text-xs text-[#25262E]"
          >
            <span class="truncate">{{ table }}</span>
            <button type="button" class="text-[#9A9A9A] hover:text-[#3B1770]" title="Remove" @click="toggle(table)">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
