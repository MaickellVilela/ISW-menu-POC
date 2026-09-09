<script setup lang="ts">
import { computed } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import {
  createFilterValueMapping,
  type FilterValueMapping,
  type FilterValueProvider,
} from '~/composables/useFilterValueConfiguration';

const props = defineProps<{
  modelValue: FilterValueMapping[];
  provider: FilterValueProvider;
  targetFields: FieldOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [mappings: FilterValueMapping[]];
}>();

const usedTargetFields = computed(() =>
  new Set(props.modelValue.map((mapping) => mapping.targetField).filter(Boolean)),
);

function updateMapping(
  id: string,
  patch: Partial<FilterValueMapping>,
): void {
  emit(
    'update:modelValue',
    props.modelValue.map((mapping) =>
      mapping.id === id ? { ...mapping, ...patch } : mapping,
    ),
  );
}

function updateTarget(id: string, event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const field = props.targetFields.find((candidate) => candidate.value === value);
  updateMapping(id, {
    targetField: value,
    targetLabel: field?.name ?? value,
  });
}

function updateProviderField(
  id: string,
  key: 'valueField' | 'labelField',
  event: Event,
): void {
  updateMapping(id, key === 'valueField'
    ? {
      valueField: (event.target as HTMLSelectElement).value,
      labelField: '',
    }
    : { labelField: (event.target as HTMLSelectElement).value });
}

function addMapping(): void {
  const firstUnusedTarget = props.targetFields.find(
    (field) => !usedTargetFields.value.has(field.value),
  );
  emit('update:modelValue', [
    ...props.modelValue,
    createFilterValueMapping(
      `mapping-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      firstUnusedTarget,
      props.provider.sourceItem.fields[0],
    ),
  ]);
}

function removeMapping(id: string): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((mapping) => mapping.id !== id),
  );
}
</script>

<template>
  <div>
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-[#25262E]">Field mappings</h3>
      <p class="mt-1 text-xs leading-relaxed text-[#6B6B6B]">
        Connect each data-source field to the prepared column that supplies its selectable values.
      </p>
    </div>

    <div
      v-if="targetFields.length === 0"
      class="rounded-lg border border-dashed border-[#C9CED6] px-5 py-10 text-center"
    >
      <p class="text-sm font-medium text-[#25262E]">No output fields available</p>
      <p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#6B6B6B]">
        Connect entities to Output on the canvas before mapping a filter-value source.
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(mapping, index) in modelValue"
        :key="mapping.id"
        class="rounded-lg border border-[#E2E2E2] bg-white p-4"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-xs font-semibold text-[#52525B]">Mapping {{ index + 1 }}</p>
          <button
            v-if="modelValue.length > 1"
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded text-[#7A7A7A] transition-colors hover:bg-[#FCEEEF] hover:text-[#B4232D]"
            :aria-label="`Remove mapping ${index + 1}`"
            @click="removeMapping(mapping.id)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 7h16M9 7V4h6v3M8 10v9M12 10v9M16 10v9M6 7l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] md:items-end">
          <label class="grid min-w-0 gap-1.5 text-xs font-medium text-[#52525B]">
            Data-source field
            <select
              :value="mapping.targetField"
              class="h-9 min-w-0 rounded-md border border-[#C9CED6] bg-white px-2.5 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
              @change="updateTarget(mapping.id, $event)"
            >
              <option value="" disabled>Select field</option>
              <option
                v-for="field in targetFields"
                :key="field.value"
                :value="field.value"
                :disabled="usedTargetFields.has(field.value) && field.value !== mapping.targetField"
              >
                {{ field.entity }} · {{ field.name }}
              </option>
            </select>
          </label>

          <svg
            viewBox="0 0 24 24"
            class="mb-2 hidden h-4 w-4 text-[#8A8A8A] md:block"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M5 12h14M14 7l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>

          <label class="grid min-w-0 gap-1.5 text-xs font-medium text-[#52525B]">
            Value column
            <select
              :value="mapping.valueField"
              class="h-9 min-w-0 rounded-md border border-[#C9CED6] bg-white px-2.5 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
              @change="updateProviderField(mapping.id, 'valueField', $event)"
            >
              <option value="" disabled>Select column</option>
              <option
                v-for="field in provider.sourceItem.fields"
                :key="field.name"
                :value="field.name"
              >
                {{ field.name }}
              </option>
            </select>
          </label>
        </div>

        <label class="mt-3 grid gap-1.5 text-xs font-medium text-[#52525B] md:ml-[calc(50%+0.75rem)]">
          Display-label column
          <select
            :value="mapping.labelField"
            class="h-9 min-w-0 rounded-md border border-[#C9CED6] bg-white px-2.5 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
            @change="updateProviderField(mapping.id, 'labelField', $event)"
          >
            <option value="">Same as value column</option>
            <option
              v-for="field in provider.sourceItem.fields"
              :key="field.name"
              :value="field.name"
              :disabled="field.name === mapping.valueField"
            >
              {{ field.name }}
            </option>
          </select>
        </label>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-[#C9CED6] bg-white px-3 py-2 text-xs font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5] disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="modelValue.length >= targetFields.length"
        @click="addMapping"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Add mapping
      </button>
    </div>
  </div>
</template>
