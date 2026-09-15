<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import {
  defaultOperatorForFilterType,
  filterFieldDisplayName,
  filterUsesRange,
  normalizeFilterFieldType,
  operatorsForFilterType,
  type GlobalFilter,
  type GlobalFilterDraft,
  type GlobalFilterOperator,
} from '~/composables/useDataSourceGlobalSettings';

const props = withDefaults(
  defineProps<{
    field: FieldOption;
    sourceName: string;
    initialFilter?: GlobalFilter | null;
    editing?: boolean;
    originLabel?: string;
  }>(),
  { initialFilter: null, editing: false, originLabel: 'Global filters' },
);

const emit = defineEmits<{
  back: [];
  cancel: [];
  apply: [filter: GlobalFilterDraft];
}>();

const fieldType = normalizeFilterFieldType(props.field.type);
const operator = ref<GlobalFilterOperator>(
  props.initialFilter?.operator ?? defaultOperatorForFilterType(fieldType),
);
const values = ref<string[]>([
  props.initialFilter?.values[0] ?? '',
  props.initialFilter?.values[1] ?? '',
]);

const operators = computed(() => operatorsForFilterType(fieldType));
const usesRange = computed(() => filterUsesRange(operator.value));
const fieldLabel = computed(() => filterFieldDisplayName(props.field.name));
const requiredValueCount = computed(() => usesRange.value ? 2 : 1);
const canApply = computed(() =>
  values.value.slice(0, requiredValueCount.value).every((value) => value.trim().length > 0),
);

const inputType = computed(() => {
  if (fieldType === 'number') return 'number';
  if (fieldType === 'time') return 'datetime-local';
  return 'text';
});

function updateOperator(event: Event): void {
  operator.value = (event.target as HTMLSelectElement).value as GlobalFilterOperator;
}

function updateValue(index: number, event: Event): void {
  const nextValues = [...values.value];
  nextValues[index] = (event.target as HTMLInputElement).value;
  values.value = nextValues;
}

function apply(): void {
  if (!canApply.value) return;
  emit('apply', {
    field: props.field.value,
    fieldLabel: fieldLabel.value,
    fieldType,
    operator: operator.value,
    values: values.value.slice(0, requiredValueCount.value),
  });
}
</script>

<template>
  <div class="flex max-h-[min(42rem,calc(100vh-4rem))] flex-col">
    <header class="flex flex-shrink-0 items-center justify-between gap-4 px-6 pb-3 pt-5">
      <div class="min-w-0">
        <p class="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#6F42A5]">{{ originLabel }}</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-1 py-1 text-[#25262E] transition-colors hover:text-[#6F42A5]"
          @click="emit('back')"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#64748B]" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m14.5 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="text-xl font-semibold">Select values</span>
        </button>
      </div>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
        aria-label="Close value selection"
        @click="emit('cancel')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-7 pb-2">
      <p class="mb-6 flex flex-wrap items-center gap-2 text-base text-[#667892]">
        <span>{{ sourceName }}</span>
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ fieldLabel }}</span>
      </p>

      <div class="grid gap-6">
        <div class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
          <label for="filter-operator" class="text-base font-medium text-[#25262E]">Operator</label>
          <select
            id="filter-operator"
            :value="operator"
            class="h-11 rounded-md border border-[#BFC6CF] bg-white px-3 text-base text-[#25262E] outline-none focus:border-[#6F42A5] focus:ring-1 focus:ring-[#6F42A5]"
            @change="updateOperator"
          >
            <option v-for="option in operators" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>

        <div
          v-for="(_, index) in values.slice(0, requiredValueCount)"
          :key="index"
          class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
        >
          <label :for="`filter-value-${index}`" class="text-base font-medium text-[#25262E]">
            {{ usesRange ? (index === 0 ? 'From' : 'To') : 'Value' }}
          </label>
          <div class="flex h-11 min-w-0 overflow-hidden rounded-md border border-[#BFC6CF] bg-white focus-within:border-[#6F42A5] focus-within:ring-1 focus-within:ring-[#6F42A5]">
            <span class="flex w-12 flex-shrink-0 items-center justify-center border-r border-[#BFC6CF] text-[#667892]">
              <svg
                v-if="fieldType === 'number'"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
                <path d="M8 7h8v3H8zM8 13h1M12 13h1M16 13h.01M8 17h1M12 17h1M16 17h.01" stroke-linecap="round" />
              </svg>
              <svg
                v-else-if="fieldType === 'time'"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
                <path d="M8 3v5M16 3v5M4 10h16" stroke-linecap="round" />
              </svg>
              <span v-else class="text-xs font-semibold">ABC</span>
            </span>
            <input
              :id="`filter-value-${index}`"
              :type="inputType"
              :step="fieldType === 'number' ? 'any' : undefined"
              :value="values[index]"
              :placeholder="
                usesRange
                  ? index === 0 ? 'Start value' : 'End value'
                  : operator === 'Include' || operator === 'Exclude'
                    ? 'Enter comma-separated values'
                    : 'Enter a value'
              "
              class="min-w-0 flex-1 border-0 bg-white px-3 text-base text-[#25262E] placeholder:text-[#9AA2AE] outline-none"
              @input="updateValue(index, $event)"
              @keydown.enter="apply"
            />
          </div>
        </div>
      </div>
    </div>

    <footer class="mt-6 flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-6 py-4">
      <button
        type="button"
        class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
        :disabled="!canApply"
        @click="apply"
      >
        {{ editing ? 'Update filter' : 'Add filter' }}
      </button>
    </footer>
  </div>
</template>
