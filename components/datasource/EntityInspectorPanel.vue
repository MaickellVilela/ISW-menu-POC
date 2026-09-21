<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DATA_SOURCE_CONNECTIONS,
  connectionUsesSchemas,
  schemasForConnection,
} from '~/composables/dataSourceCatalog';
import {
  applyConnectionChange,
  applyEntityChange,
  applyInspectorDraft,
  applySchemaChange,
  applySourceKindChange,
  availableFieldsForDraft,
  catalogEntitiesForDraft,
  catalogViewSourceId,
  connectionForDraft,
  draftFromNode,
  fileFieldsForNode,
  fileSourceLabel,
  filterInspectorFields,
  includedFieldsFromDraft,
  inspectorCatalogMode,
  isInspectorDraftDirty,
  isInspectorDraftValid,
  type EntityInspectorDraft,
} from '~/composables/entityInspectorDraft';
import {
  previewFields,
  type CanvasNode,
  type TableRebindPatch,
} from '~/composables/useDataSourceCanvas';
import HighlightedText from './HighlightedText.vue';

const props = defineProps<{
  node: CanvasNode;
}>();

const emit = defineEmits<{
  close: [];
  apply: [patch: TableRebindPatch];
  'view-catalog': [sourceId: string];
}>();

const detailsOpen = ref(true);
const fieldsOpen = ref(true);
const previewOpen = ref(false);
const fieldQuery = ref('');
const hideUnused = ref(false);
const initialDraft = draftFromNode(props.node);
const draft = ref<EntityInspectorDraft>(initialDraft);
const baseline = ref<EntityInspectorDraft>(cloneDraft(initialDraft));

function cloneDraft(value: EntityInspectorDraft): EntityInspectorDraft {
  return JSON.parse(JSON.stringify(value)) as EntityInspectorDraft;
}

function resetFromNode(node: CanvasNode): void {
  const next = draftFromNode(node);
  draft.value = next;
  baseline.value = cloneDraft(next);
  fieldQuery.value = '';
  hideUnused.value = false;
}

watch(
  () => props.node.id,
  () => resetFromNode(props.node),
);

const mode = computed(() => inspectorCatalogMode(props.node));
const isFile = computed(() => mode.value === 'file');
const connection = computed(() => connectionForDraft(draft.value));
const usesSchemas = computed(() => Boolean(connection.value && connectionUsesSchemas(connection.value)));
const schemas = computed(() => (connection.value ? schemasForConnection(connection.value) : []));
const entities = computed(() => catalogEntitiesForDraft(draft.value));
const fileFields = computed(() => fileFieldsForNode(props.node));
const availableFields = computed(() => availableFieldsForDraft(draft.value, fileFields.value));
const visibleFields = computed(() =>
  filterInspectorFields(availableFields.value, fieldQuery.value, hideUnused.value, draft.value.includedByName),
);
const includedCount = computed(
  () => availableFields.value.filter((field) => draft.value.includedByName[field.name] !== false).length,
);
const allIncluded = computed(
  () => availableFields.value.length > 0 && includedCount.value === availableFields.value.length,
);
const isDirty = computed(() => isInspectorDraftDirty(draft.value, baseline.value));
const canApply = computed(() => isDirty.value && isInspectorDraftValid(draft.value, mode.value, availableFields.value));
const preview = computed(() =>
  previewFields(
    includedFieldsFromDraft(availableFields.value, draft.value.includedByName).map((field) => ({
      value: field.name,
      name: field.name,
      type: field.type,
      entity: draft.value.name.trim() || props.node.label,
    })),
    draft.value.name.trim() || props.node.label,
    6,
  ),
);
const viewSourceId = computed(() => catalogViewSourceId(draft.value));

function toggleField(name: string): void {
  draft.value.includedByName = {
    ...draft.value.includedByName,
    [name]: draft.value.includedByName[name] === false,
  };
}

function setAllIncluded(included: boolean): void {
  draft.value.includedByName = Object.fromEntries(
    availableFields.value.map((field) => [field.name, included]),
  );
}

function onConnectionChange(connectionId: string): void {
  draft.value = applyConnectionChange(draft.value, connectionId);
}

function onSchemaChange(schemaName: string): void {
  draft.value = applySchemaChange(draft.value, schemaName);
}

function onEntityChange(entityKey: string): void {
  draft.value = applyEntityChange(draft.value, entityKey);
}

function onSourceKindChange(kind: EntityInspectorDraft['sourceKind']): void {
  draft.value = applySourceKindChange(draft.value, kind);
}

function onCancel(): void {
  if (isDirty.value) {
    draft.value = cloneDraft(baseline.value);
    return;
  }
  emit('close');
}

function onApply(): void {
  if (!canApply.value) return;
  emit('apply', applyInspectorDraft(props.node, draft.value));
  baseline.value = cloneDraft(draft.value);
}

function onViewCatalog(): void {
  if (!viewSourceId.value) return;
  emit('view-catalog', viewSourceId.value);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <header class="flex-shrink-0 border-b border-[#EAEAEA] px-3 py-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-medium text-[#667085] transition-colors hover:bg-[#F5F1FC] hover:text-[#3B1770]"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m14.5 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Connections
      </button>
    </header>

    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <section class="overflow-hidden rounded-lg border border-[#E2E2E2]">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2.5 text-left"
          :aria-expanded="detailsOpen"
          @click="detailsOpen = !detailsOpen"
        >
          <span class="text-sm font-semibold text-[#25262E]">Entity Details</span>
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 text-[#6B6B6B] transition-transform"
            :class="detailsOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div v-if="detailsOpen" class="space-y-3 border-t border-[#EAEAEA] px-3 py-3">
          <label class="block">
            <span class="mb-1 block text-xs font-medium text-[#52525B]">Entity Name<span class="text-[#C62828]">*</span></span>
            <input
              v-model="draft.name"
              type="text"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>

          <label v-if="isFile" class="block">
            <span class="mb-1 block text-xs font-medium text-[#52525B]">Source</span>
            <input
              :value="fileSourceLabel(node)"
              type="text"
              disabled
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-[#FAFAFA] px-2.5 text-sm text-[#667085]"
            />
          </label>

          <template v-else>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Select Connection<span class="text-[#C62828]">*</span></span>
              <select
                :value="draft.connectionId"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
                @change="onConnectionChange(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="item in DATA_SOURCE_CONNECTIONS" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
            </label>

            <div v-if="usesSchemas">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-[#52525B]">Select Schema</span>
                <button
                  type="button"
                  class="text-xs font-medium text-[#3B1770] hover:underline disabled:text-[#9A9A9A]"
                  :disabled="!viewSourceId"
                  @click="onViewCatalog"
                >
                  View
                </button>
              </div>
              <select
                :value="draft.schemaName"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
                @change="onSchemaChange(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="schema in schemas" :key="schema.name" :value="schema.name">
                  {{ schema.name }}
                </option>
              </select>
            </div>

            <fieldset class="flex items-center gap-4">
              <legend class="sr-only">Entity source</legend>
              <label class="inline-flex items-center gap-1.5 text-sm text-[#25262E]">
                <input
                  type="radio"
                  class="accent-[#3B1770]"
                  :checked="draft.sourceKind === 'existing'"
                  @change="onSourceKindChange('existing')"
                />
                Existing Entity
              </label>
              <label class="inline-flex items-center gap-1.5 text-sm text-[#25262E]">
                <input
                  type="radio"
                  class="accent-[#3B1770]"
                  :checked="draft.sourceKind === 'sql'"
                  @change="onSourceKindChange('sql')"
                />
                Custom SQL
              </label>
            </fieldset>

            <label v-if="draft.sourceKind === 'existing'" class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Select Entity<span class="text-[#C62828]">*</span></span>
              <select
                :value="draft.entityKey"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
                @change="onEntityChange(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="entity in entities" :key="entity.key" :value="entity.key">
                  {{ entity.label }}
                </option>
              </select>
            </label>

            <label v-else class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Custom SQL<span class="text-[#C62828]">*</span></span>
              <textarea
                v-model="draft.sql"
                rows="5"
                spellcheck="false"
                class="w-full rounded-md border border-[#D8D8D8] bg-[#FAFAFA] px-2.5 py-2 font-mono text-xs leading-relaxed text-[#25262E] outline-none focus:border-[#3B1770]"
              />
            </label>
          </template>

          <div class="flex items-center justify-between gap-2 pt-1">
            <span class="text-sm text-[#25262E]">Entity Data Cache</span>
            <button
              type="button"
              role="switch"
              class="relative h-5 w-9 rounded-full transition-colors"
              :class="draft.cacheEnabled ? 'bg-[#3B1770]' : 'bg-[#C9CED6]'"
              :aria-checked="draft.cacheEnabled"
              @click="draft.cacheEnabled = !draft.cacheEnabled"
            >
              <span
                class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left,right]"
                :class="draft.cacheEnabled ? 'right-0.5' : 'left-0.5'"
              />
            </button>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-lg border border-[#E2E2E2]">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2.5 text-left"
          :aria-expanded="fieldsOpen"
          @click="fieldsOpen = !fieldsOpen"
        >
          <span class="text-sm font-semibold text-[#25262E]">Available Fields</span>
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 text-[#6B6B6B] transition-transform"
            :class="fieldsOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div v-if="fieldsOpen" class="space-y-2 border-t border-[#EAEAEA] px-3 py-3">
          <label class="relative block">
            <span class="sr-only">Search fields</span>
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              v-model="fieldQuery"
              type="search"
              placeholder="Search"
              class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white py-1 pl-8 pr-2 text-xs text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>

          <div class="flex items-center justify-between gap-2">
            <label class="inline-flex items-center gap-2 text-sm text-[#25262E]">
              <input
                type="checkbox"
                class="h-3.5 w-3.5 accent-[#3B1770]"
                :checked="allIncluded"
                @change="setAllIncluded(!allIncluded)"
              />
              Select All
            </label>
            <button
              type="button"
              class="rounded p-1 text-[#6B6B6B] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
              :aria-pressed="hideUnused"
              :title="hideUnused ? 'Show unused fields' : 'Hide unused fields'"
              @click="hideUnused = !hideUnused"
            >
              <svg v-if="!hideUnused" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2" />
                <path d="M9.9 5.1A11 11 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3.2 3.9" />
                <path d="M6.1 6.1A18 18 0 0 0 2 12s4 7 10 7a11 11 0 0 0 3.2-.5" />
              </svg>
            </button>
          </div>

          <ul class="max-h-64 overflow-auto rounded-md border border-[#E2E2E2]">
            <li
              v-for="field in visibleFields"
              :key="field.name"
              class="flex items-start gap-2 border-b border-[#F0F0F0] px-2.5 py-2 last:border-b-0"
            >
              <input
                :id="`field-${node.id}-${field.name}`"
                type="checkbox"
                class="mt-0.5 h-3.5 w-3.5 accent-[#3B1770]"
                :checked="draft.includedByName[field.name] !== false"
                @change="toggleField(field.name)"
              />
              <label :for="`field-${node.id}-${field.name}`" class="min-w-0 flex-1 cursor-pointer">
                <span class="block truncate text-sm font-medium text-[#25262E]">
                  <HighlightedText :text="field.name" :query="fieldQuery" />
                </span>
                <span class="block text-[11px] text-[#9A9A9A]">{{ field.type }}</span>
              </label>
            </li>
            <li v-if="visibleFields.length === 0" class="px-2.5 py-4 text-center text-[11px] text-[#7A7A7A]">
              No fields match this search.
            </li>
          </ul>
        </div>
      </section>

      <section class="overflow-hidden rounded-lg border border-[#E2E2E2]">
        <button
          type="button"
          class="flex w-full items-center justify-between px-3 py-2.5 text-left"
          :aria-expanded="previewOpen"
          @click="previewOpen = !previewOpen"
        >
          <span class="text-sm font-semibold text-[#25262E]">Preview</span>
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 text-[#6B6B6B] transition-transform"
            :class="previewOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div v-if="previewOpen" class="border-t border-[#EAEAEA] p-3">
          <div class="overflow-auto rounded-md border border-[#E2E2E2]">
            <table v-if="preview.columns.length > 0" class="min-w-full text-left">
              <thead>
                <tr>
                  <th
                    v-for="column in preview.columns"
                    :key="column"
                    class="whitespace-nowrap border-b border-[#EAEAEA] bg-[#FAFAFA] px-2 py-1.5 text-[10px] font-semibold text-[#52525B]"
                  >
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in preview.rows" :key="index">
                  <td
                    v-for="column in preview.columns"
                    :key="column"
                    class="max-w-[7rem] truncate px-2 py-1 text-[11px] text-[#3F3F46]"
                  >
                    {{ row[column] }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="px-2 py-4 text-center text-[11px] text-[#7A7A7A]">Include at least one field to preview.</p>
          </div>
        </div>
      </section>
    </div>

    <footer class="flex flex-shrink-0 justify-end gap-2 border-t border-[#EAEAEA] px-3 py-3">
      <button
        type="button"
        class="rounded-md border border-[#C9CED6] bg-white px-3 py-1.5 text-sm font-medium text-[#667085] hover:border-[#6F42A5] hover:text-[#6F42A5]"
        @click="onCancel"
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md bg-[#3B1770] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4B1E8C] disabled:bg-[#C9CED6]"
        :disabled="!canApply"
        @click="onApply"
      >
        Apply
      </button>
    </footer>
  </div>
</template>
