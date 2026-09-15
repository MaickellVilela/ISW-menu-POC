<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import type {
  FilterLogicalOperator,
  FilterNesting,
  GlobalFilter,
  GlobalFilterDraft,
} from '~/composables/useDataSourceGlobalSettings';
import GlobalFilterCard from './GlobalFilterCard.vue';
import GlobalFilterModal from './GlobalFilterModal.vue';

const props = defineProps<{
  modelValue: GlobalFilter[];
  filterNesting: FilterNesting;
  availableFields: FieldOption[];
  sourceName: string;
}>();

const emit = defineEmits<{
  add: [filter: GlobalFilterDraft];
  update: [filter: GlobalFilter];
  remove: [id: string];
  'update-nesting-enabled': [enabled: boolean];
  'update-nesting-operator': [operator: FilterLogicalOperator];
  'move-to-nested': [id: string];
  'move-to-root': [id: string];
}>();

const showFilterModal = ref(false);
const editingFilter = ref<GlobalFilter | null>(null);
const nestedDragActive = ref(false);
const rootDragActive = ref(false);

const nestedFilterIds = computed(() => new Set(props.filterNesting.filterIds));
const rootFilters = computed(() =>
  props.modelValue.filter((filter) => !nestedFilterIds.value.has(filter.id)),
);
const nestedFilters = computed(() =>
  props.filterNesting.filterIds.flatMap((id) => {
    const filter = props.modelValue.find((candidate) => candidate.id === id);
    return filter ? [filter] : [];
  }),
);

function openNewFilter(): void {
  editingFilter.value = null;
  showFilterModal.value = true;
}

function openExistingFilter(filter: GlobalFilter): void {
  editingFilter.value = filter;
  showFilterModal.value = true;
}

function closeFilterModal(): void {
  showFilterModal.value = false;
  editingFilter.value = null;
}

function saveFilter(draft: GlobalFilterDraft): void {
  if (editingFilter.value) {
    emit('update', { id: editingFilter.value.id, ...draft });
  } else {
    emit('add', draft);
  }
  closeFilterModal();
}

function droppedFilterId(event: DragEvent): string | null {
  const id = event.dataTransfer?.getData('application/x-global-filter')
    || event.dataTransfer?.getData('text/plain');
  return id && props.modelValue.some((filter) => filter.id === id) ? id : null;
}

function dropIntoNested(event: DragEvent): void {
  nestedDragActive.value = false;
  rootDragActive.value = false;
  const id = droppedFilterId(event);
  if (id) emit('move-to-nested', id);
}

function dropIntoRoot(event: DragEvent): void {
  rootDragActive.value = false;
  nestedDragActive.value = false;
  const id = droppedFilterId(event);
  if (id) emit('move-to-root', id);
}

function updateNestingOperator(event: Event): void {
  emit(
    'update-nesting-operator',
    (event.target as HTMLSelectElement).value as FilterLogicalOperator,
  );
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-7 lg:px-10 lg:py-9">
    <header>
      <h1 class="text-xl font-semibold text-[#25262E]">Global filters</h1>
      <p class="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">
        Filters applied to the entire source output. Every visual that uses this source starts from this subset.
      </p>
    </header>

    <section class="mt-7">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DCE2] pb-3">
        <div>
          <h2 class="text-sm font-semibold text-[#25262E]">Applied to the source output</h2>
          <p class="mt-0.5 text-xs text-[#6B6B6B]">Choose fields, values, and how these filters are combined.</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-[#3B1770] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#4B1E8C]"
          @click="openNewFilter"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Add filter
        </button>
      </div>

      <div
        v-if="modelValue.length === 0"
        class="mt-5 rounded-xl border border-dashed border-[#D8D8D8] bg-white px-6 py-14 text-center"
      >
        <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F1ECFA] text-[#3B1770]">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" stroke-linejoin="round" />
          </svg>
        </span>
        <h3 class="mt-4 text-sm font-semibold text-[#25262E]">No global filters</h3>
        <p class="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-[#6B6B6B]">
          Add a filter when the source output should start from a subset of the data.
        </p>
        <button
          type="button"
          class="mt-5 rounded-md border border-[#D8D8D8] bg-white px-3.5 py-2 text-xs font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:text-[#3B1770]"
          @click="openNewFilter"
        >
          Add your first filter
        </button>
      </div>

      <div v-else class="mt-5">
        <div class="mb-3 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-semibold text-[#25262E]">Nest filters</h3>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Drag filters into a group to combine them.</p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
            :class="
              filterNesting.enabled
                ? 'border-[#6F42A5] bg-[#F1ECFA] text-[#6F42A5]'
                : 'border-[#D8DCE2] bg-white text-[#667892] hover:border-[#6F42A5] hover:text-[#6F42A5]'
            "
            :aria-pressed="filterNesting.enabled"
            :aria-label="filterNesting.enabled ? 'Disable nested filters' : 'Enable nested filters'"
            @click="emit('update-nesting-enabled', !filterNesting.enabled)"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 5v4h4M5 9l5-5M9 19h10V9M14 9h5v5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div
          class="space-y-2 rounded-lg transition-colors"
          :class="rootDragActive ? 'bg-[#F1ECFA] ring-2 ring-[#6F42A5]/40' : ''"
          role="list"
          aria-label="Top-level filters"
          @dragenter.prevent="rootDragActive = true"
          @dragover.prevent
          @dragleave.self="rootDragActive = false"
          @drop.prevent="dropIntoRoot"
        >
          <template v-for="(filter, index) in rootFilters" :key="filter.id">
            <p v-if="index > 0" class="px-1 text-xs font-semibold text-[#52525B]">AND</p>
            <GlobalFilterCard
              :filter="filter"
              :nested="false"
              @edit="openExistingFilter(filter)"
              @move="emit('move-to-nested', filter.id)"
              @remove="emit('remove', filter.id)"
            />
          </template>

          <p
            v-if="rootFilters.length === 0 && nestedFilters.length > 0"
            class="rounded-lg border border-dashed border-[#C9CED6] px-4 py-3 text-center text-xs text-[#667892]"
          >
            Drop here to move a filter out of the nested group.
          </p>
        </div>

        <p
          v-if="filterNesting.enabled && rootFilters.length > 0 && nestedFilters.length > 0"
          class="my-2 px-1 text-xs font-semibold text-[#52525B]"
        >
          AND
        </p>

        <section
          v-if="filterNesting.enabled"
          class="mt-2 rounded-xl border bg-white p-4 transition-colors"
          :class="
            nestedDragActive
              ? 'border-[#6F42A5] bg-[#FAF8FD] ring-2 ring-[#6F42A5]/30'
              : 'border-[#D8DCE2]'
          "
          aria-label="Nested filter group"
          @dragenter.stop.prevent="nestedDragActive = true"
          @dragover.stop.prevent
          @dragleave.self="nestedDragActive = false"
          @drop.stop.prevent="dropIntoNested"
        >
          <div class="mb-3 flex items-center justify-end gap-2">
            <label class="sr-only" for="nested-filter-operator">Nested filter operator</label>
            <select
              id="nested-filter-operator"
              :value="filterNesting.operator"
              class="h-9 rounded-md border border-[#C9CED6] bg-white px-3 text-sm font-medium text-[#25262E] outline-none focus:border-[#6F42A5]"
              @change="updateNestingOperator"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>

          <template v-for="(filter, index) in nestedFilters" :key="filter.id">
            <p v-if="index > 0" class="my-2 px-1 text-xs font-semibold text-[#52525B]">
              {{ filterNesting.operator }}
            </p>
            <GlobalFilterCard
              :filter="filter"
              :nested="true"
              @edit="openExistingFilter(filter)"
              @move="emit('move-to-root', filter.id)"
              @remove="emit('remove', filter.id)"
            />
          </template>

          <p
            v-if="nestedFilters.length > 0"
            class="my-2 px-1 text-xs font-semibold text-[#52525B]"
          >
            {{ filterNesting.operator }}
          </p>

          <div
            class="rounded-md border border-dashed border-[#BFC6CF] px-5 py-5 text-center text-sm font-medium text-[#667892]"
          >
            Drop a filter here
          </div>

          <template v-if="nestedFilters.length === 0">
            <p class="my-2 px-1 text-xs font-semibold text-[#52525B]">{{ filterNesting.operator }}</p>
            <div class="rounded-md border border-dashed border-[#BFC6CF] px-5 py-5 text-center text-sm font-medium text-[#667892]">
              Filter needed here
            </div>
          </template>
        </section>
      </div>

      <p v-if="availableFields.length === 0" class="mt-3 text-xs text-[#9A9A9A]">
        Add entities on the canvas and connect them to Output before creating a filter.
      </p>
    </section>

    <GlobalFilterModal
      :open="showFilterModal"
      :fields="availableFields"
      :source-name="sourceName"
      :filter="editingFilter"
      @cancel="closeFilterModal"
      @save="saveFilter"
    />
  </div>
</template>
