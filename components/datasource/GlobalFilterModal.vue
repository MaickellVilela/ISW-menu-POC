<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';
import type {
  FilterFieldType,
  GlobalFilter,
  GlobalFilterDraft,
} from '~/composables/useDataSourceGlobalSettings';
import GlobalFilterFieldPicker from './GlobalFilterFieldPicker.vue';
import GlobalFilterValuePicker from './GlobalFilterValuePicker.vue';

type FilterModalStep = 'field' | 'values';

const props = withDefaults(
  defineProps<{
    open: boolean;
    fields: FieldOption[];
    sourceName: string;
    filter?: GlobalFilter | null;
    initialField?: FieldOption | null;
    originLabel?: string;
  }>(),
  { filter: null, initialField: null, originLabel: 'Global filters' },
);

const emit = defineEmits<{
  cancel: [];
  save: [filter: GlobalFilterDraft];
}>();

const step = ref<FilterModalStep>('field');
const selectedField = ref<FieldOption | null>(null);

function sourceType(type: FilterFieldType): string {
  if (type === 'number') return 'Number';
  if (type === 'time') return 'Time';
  return 'Attribute';
}

function fieldForFilter(filter: GlobalFilter): FieldOption {
  return props.fields.find((field) => field.value === filter.field) ?? {
    value: filter.field,
    name: filter.fieldLabel,
    type: sourceType(filter.fieldType),
    entity: props.sourceName,
  };
}

function resetFlow(): void {
  if (props.filter) {
    selectedField.value = fieldForFilter(props.filter);
    step.value = 'values';
    return;
  }

  if (props.initialField) {
    selectedField.value = props.fields.find((field) => field.value === props.initialField?.value)
      ?? props.initialField;
    step.value = 'values';
    return;
  }

  selectedField.value = null;
  step.value = 'field';
}

watch(
  () => [props.open, props.filter, props.initialField] as const,
  ([open]) => {
    if (open) resetFlow();
  },
  { immediate: true },
);

function selectField(field: FieldOption): void {
  selectedField.value = field;
  step.value = 'values';
}

function returnToFields(): void {
  selectedField.value = null;
  step.value = 'field';
}

function save(filter: GlobalFilterDraft): void {
  emit('save', filter);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <section
        class="w-[min(60rem,calc(100vw-2rem))] overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Configure global filter"
      >
        <GlobalFilterFieldPicker
          v-if="step === 'field'"
          :fields="fields"
          :source-name="sourceName"
          :origin-label="originLabel"
          @cancel="emit('cancel')"
          @select="selectField"
        />

        <GlobalFilterValuePicker
          v-else-if="selectedField"
          :key="`${filter?.id ?? 'new'}-${selectedField.value}`"
          :field="selectedField"
          :source-name="sourceName"
          :initial-filter="selectedField.value === filter?.field ? filter : null"
          :editing="Boolean(filter)"
          :origin-label="originLabel"
          @apply="save"
          @back="returnToFields"
          @cancel="emit('cancel')"
        />
      </section>
    </div>
  </Teleport>
</template>
