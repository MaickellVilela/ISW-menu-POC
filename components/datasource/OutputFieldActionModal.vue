<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type {
  DirectFieldCandidate,
  MetricAggregation,
  OutputTranslationFile,
} from '~/composables/useDataSourceCanvas';

export type OutputModalMode = 'direct-field' | 'custom-metric' | 'translation';

const AGGREGATIONS: { value: MetricAggregation; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const LOCALES = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'pt-BR', 'ja-JP'];

const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: OutputModalMode | null;
    directFieldOptions?: DirectFieldCandidate[];
    metricFieldOptions?: { value: string; label: string }[];
    currentTranslation?: OutputTranslationFile;
  }>(),
  { directFieldOptions: () => [], metricFieldOptions: () => [], currentTranslation: undefined },
);

const emit = defineEmits<{
  cancel: [];
  'save-direct-field': [payload: { nodeId: string; fieldName: string }];
  'save-custom-metric': [payload: { name: string; sourceField: string; aggregation: MetricAggregation }];
  'save-translation': [payload: OutputTranslationFile];
}>();

const firstInput = ref<HTMLElement | null>(null);
const directFieldKey = ref('');
const metricName = ref('');
const metricSourceField = ref('');
const metricAggregation = ref<MetricAggregation>('sum');
const translationFileName = ref('');
const translationLocale = ref('en-US');

function directFieldOptionKey(option: DirectFieldCandidate): string {
  return `${option.nodeId}::${option.fieldName}`;
}

function reset(): void {
  directFieldKey.value = props.directFieldOptions[0] ? directFieldOptionKey(props.directFieldOptions[0]) : '';
  metricName.value = '';
  metricSourceField.value = props.metricFieldOptions[0]?.value ?? '';
  metricAggregation.value = 'sum';
  translationFileName.value = props.currentTranslation?.fileName ?? '';
  translationLocale.value = props.currentTranslation?.locale ?? 'en-US';
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    reset();
    await nextTick();
    firstInput.value?.focus();
  },
);

const title = computed(() => {
  if (props.mode === 'direct-field') return 'Add Direct Field';
  if (props.mode === 'custom-metric') return 'Add Custom Metric';
  return 'Update Translation File';
});

const canSave = computed(() => {
  if (props.mode === 'direct-field') return directFieldKey.value !== '';
  if (props.mode === 'custom-metric') return metricName.value.trim() !== '' && metricSourceField.value !== '';
  if (props.mode === 'translation') return translationFileName.value.trim() !== '';
  return false;
});

function onFileChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) translationFileName.value = file.name;
}

function save(): void {
  if (!canSave.value) return;
  if (props.mode === 'direct-field') {
    const [nodeId, fieldName] = directFieldKey.value.split('::');
    if (!nodeId || !fieldName) return;
    emit('save-direct-field', { nodeId, fieldName });
    return;
  }
  if (props.mode === 'custom-metric') {
    emit('save-custom-metric', {
      name: metricName.value.trim(),
      sourceField: metricSourceField.value,
      aggregation: metricAggregation.value,
    });
    return;
  }
  if (props.mode === 'translation') {
    emit('save-translation', { fileName: translationFileName.value.trim(), locale: translationLocale.value });
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <section
        class="flex w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="output-field-action-title"
      >
        <header class="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <h2 id="output-field-action-title" class="text-lg font-semibold text-[#25262E]">{{ title }}</h2>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] outline-none hover:bg-[#F3F3F4] hover:text-[#25262E] focus-visible:ring-2 focus-visible:ring-[#6F42A5]"
            aria-label="Close"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="space-y-3 px-5 py-3">
          <template v-if="mode === 'direct-field'">
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Field<span class="text-[#C62828]">*</span></span>
              <select
                ref="firstInput"
                v-model="directFieldKey"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
              >
                <option v-if="directFieldOptions.length === 0" value="">No tables on the canvas yet</option>
                <option
                  v-for="option in directFieldOptions"
                  :key="directFieldOptionKey(option)"
                  :value="directFieldOptionKey(option)"
                >
                  {{ option.nodeLabel }}.{{ option.fieldName }} ({{ option.fieldType }})
                </option>
              </select>
            </label>
            <p class="text-[11px] text-[#7A7A7A]">Adds this field to the output even if it isn't wired through a join.</p>
          </template>

          <template v-else-if="mode === 'custom-metric'">
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Metric Name<span class="text-[#C62828]">*</span></span>
              <input
                ref="firstInput"
                v-model="metricName"
                type="text"
                placeholder="e.g. Total Revenue"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Source Field<span class="text-[#C62828]">*</span></span>
              <select
                v-model="metricSourceField"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
              >
                <option v-if="metricFieldOptions.length === 0" value="">No fields available yet</option>
                <option v-for="option in metricFieldOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Aggregation</span>
              <select
                v-model="metricAggregation"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
              >
                <option v-for="option in AGGREGATIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </template>

          <template v-else-if="mode === 'translation'">
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">File<span class="text-[#C62828]">*</span></span>
              <input
                ref="firstInput"
                type="file"
                accept=".json,.csv,.xlsx"
                class="block w-full text-sm text-[#25262E] file:mr-3 file:rounded-md file:border-0 file:bg-[#F1ECFA] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#3B1770] hover:file:bg-[#E7DEF7]"
                @change="onFileChange"
              />
              <p v-if="translationFileName" class="mt-1 truncate text-[11px] text-[#7A7A7A]">Selected: {{ translationFileName }}</p>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Locale</span>
              <select
                v-model="translationLocale"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
              >
                <option v-for="locale in LOCALES" :key="locale" :value="locale">{{ locale }}</option>
              </select>
            </label>
          </template>
        </div>

        <footer class="mt-1 flex justify-end gap-2 border-t border-[#E2E2E2] px-5 py-3">
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
            @click="save"
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
