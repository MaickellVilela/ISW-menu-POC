<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  RECOMMENDED_TABLE_LIMIT,
  type SchemaOption,
  type TableConfigPayload,
} from '~/composables/useDataSourceFlow';

const props = defineProps<{ schemas: SchemaOption[]; tables: string[] }>();
const emit = defineEmits<{ submit: [payload: TableConfigPayload] }>();

const selectedSchema = ref(props.schemas[0]?.name ?? '');
const schemaSearch = ref('');
const tableSearch = ref('');
const selected = ref<string[]>([]);

const filteredSchemas = computed(() =>
  props.schemas.filter((schema) =>
    schema.name.toLowerCase().includes(schemaSearch.value.trim().toLowerCase()),
  ),
);

const filteredTables = computed(() =>
  props.tables.filter((table) =>
    table.toLowerCase().includes(tableSearch.value.trim().toLowerCase()),
  ),
);

const overLimit = computed(() => selected.value.length > RECOMMENDED_TABLE_LIMIT);
const canSubmit = computed(() => selected.value.length > 0);

function isSelected(table: string): boolean {
  return selected.value.includes(table);
}

function toggle(table: string): void {
  if (isSelected(table)) {
    selected.value = selected.value.filter((item) => item !== table);
  } else {
    selected.value = [...selected.value, table];
  }
}

function submit(): void {
  if (!canSubmit.value) return;
  emit('submit', { schema: selectedSchema.value, tables: selected.value });
}
</script>

<template>
  <div class="rounded-xl border border-[#E2E2E2] bg-white p-4">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-[#25262E]">Set table configuration</p>
      <span class="text-xs text-[#9A9A9A]">Tables selected: {{ selected.length }}</span>
    </div>
    <p class="mt-0.5 text-xs text-[#6B6B6B]">Select the tables the agent should assess.</p>

    <div
      class="mt-3 rounded-md border-l-2 px-3 py-2 text-[11px]"
      :class="overLimit ? 'border-[#B4381F] bg-[#FBEDE9] text-[#B4381F]' : 'border-[#3B1770] bg-[#F5F1FC] text-[#6B6B6B]'"
    >
      Use {{ RECOMMENDED_TABLE_LIMIT }} tables or fewer for best results. More tables may slow the
      agent and require manual adjustments.
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <!-- Schemas -->
      <div class="rounded-lg border border-[#E2E2E2]">
        <p class="border-b border-[#E2E2E2] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">Schemas</p>
        <div class="p-1.5">
          <input
            v-model="schemaSearch"
            type="text"
            placeholder="Search schemas"
            class="mb-1.5 w-full rounded border border-[#E2E2E2] px-2 py-1 text-xs focus:border-[#3B1770] focus:outline-none"
          />
          <button
            v-for="schema in filteredSchemas"
            :key="schema.name"
            type="button"
            class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors"
            :class="selectedSchema === schema.name ? 'bg-[#F5F1FC] text-[#3B1770]' : 'text-[#25262E] hover:bg-[#F5F5F5]'"
            @click="selectedSchema = schema.name"
          >
            <span class="font-medium">{{ schema.name }}</span>
            <span class="text-[10px] text-[#9A9A9A]">{{ schema.tableCount }}</span>
          </button>
        </div>
      </div>

      <!-- Tables -->
      <div class="rounded-lg border border-[#E2E2E2]">
        <p class="border-b border-[#E2E2E2] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">Tables</p>
        <div class="p-1.5">
          <input
            v-model="tableSearch"
            type="text"
            placeholder="Search tables"
            class="mb-1.5 w-full rounded border border-[#E2E2E2] px-2 py-1 text-xs focus:border-[#3B1770] focus:outline-none"
          />
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
        <p class="border-b border-[#E2E2E2] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">Selected</p>
        <div class="p-1.5">
          <p v-if="selected.length === 0" class="px-2 py-1.5 text-xs text-[#9A9A9A]">No tables selected yet.</p>
          <div
            v-for="table in selected"
            :key="table"
            class="flex items-center justify-between rounded px-2 py-1.5 text-xs text-[#25262E]"
          >
            <span>{{ table }}</span>
            <button type="button" class="text-[#9A9A9A] hover:text-[#3B1770]" title="Remove" @click="toggle(table)">
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canSubmit"
        @click="submit"
      >
        Create data source
      </button>
    </div>
  </div>
</template>
