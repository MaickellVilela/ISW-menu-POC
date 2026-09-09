<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { dataSourceFileKind } from '~/composables/dataSourceCatalog';
import {
  sourcePreview,
  type FileFilterValueProvider,
} from '~/composables/useFilterValueConfiguration';

const props = defineProps<{
  open: boolean;
  provider: FileFilterValueProvider | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [provider: FileFilterValueProvider];
}>();

const displayName = ref('');
const description = ref('');
const replacementFileName = ref('');
const delimiter = ref(',');
const quoteCharacter = ref('"');
const previewLimit = ref(10);
const hasHeaders = ref(true);
const replaceOnUpload = ref(true);
const fileInput = ref<HTMLInputElement | null>(null);

const preview = computed(() =>
  props.provider
    ? sourcePreview(props.provider.sourceItem, Math.min(previewLimit.value, 8))
    : { columns: [], rows: [] },
);

function reset(): void {
  if (!props.provider) return;
  displayName.value = props.provider.name;
  description.value = props.provider.file.options.description;
  replacementFileName.value = '';
  delimiter.value = props.provider.file.options.delimiter;
  quoteCharacter.value = props.provider.file.options.quoteCharacter;
  previewLimit.value = props.provider.file.options.previewLimit;
  hasHeaders.value = props.provider.file.options.hasHeaders;
  replaceOnUpload.value = props.provider.file.options.replaceOnUpload;
}

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
  { immediate: true },
);

function chooseFile(): void {
  fileInput.value?.click();
}

function selectFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  replacementFileName.value = input.files?.[0]?.name ?? '';
}

function save(): void {
  if (!props.provider || !displayName.value.trim()) return;
  const fileName = replacementFileName.value || props.provider.file.name;
  emit('save', {
    ...props.provider,
    name: displayName.value.trim(),
    sourceItem: {
      ...props.provider.sourceItem,
      label: displayName.value.trim(),
      description: description.value.trim() || props.provider.sourceItem.description,
      fields: props.provider.sourceItem.fields.map((field) => ({ ...field })),
    },
    file: {
      ...props.provider.file,
      name: fileName,
      kind: dataSourceFileKind(fileName),
      options: {
        description: description.value.trim(),
        delimiter: delimiter.value || ',',
        quoteCharacter: quoteCharacter.value,
        previewLimit: Math.min(1000, Math.max(1, Math.round(previewLimit.value))),
        hasHeaders: hasHeaders.value,
        replaceOnUpload: replaceOnUpload.value,
      },
    },
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && provider"
      class="fixed inset-0 z-[130] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <section
        class="flex max-h-[min(48rem,calc(100vh-2rem))] w-[min(68rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Edit filter value file"
      >
        <header class="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[#E2E2E2] px-6 py-5">
          <div>
            <h2 class="text-xl font-semibold text-[#25262E]">Edit file source</h2>
            <p class="mt-1 text-sm text-[#667085]">{{ provider.file.name }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
            aria-label="Close file editor"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div class="border-b border-[#E2E2E2] p-6 lg:border-b-0 lg:border-r">
            <h3 class="border-b border-[#D8DCE2] pb-2 text-sm font-semibold text-[#25262E]">File details</h3>

            <label class="mt-4 grid gap-1.5 text-xs font-medium text-[#52525B]">
              Display name
              <input
                v-model="displayName"
                type="text"
                class="h-9 rounded-md border border-[#C9CED6] px-3 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
              />
            </label>

            <label class="mt-4 grid gap-1.5 text-xs font-medium text-[#52525B]">
              Description
              <textarea
                v-model="description"
                rows="3"
                maxlength="500"
                placeholder="Add a description"
                class="resize-none rounded-md border border-[#C9CED6] px-3 py-2 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
              ></textarea>
            </label>

            <h3 class="mt-6 border-b border-[#D8DCE2] pb-2 text-sm font-semibold text-[#25262E]">Data details</h3>

            <div class="mt-4">
              <p class="text-xs font-medium text-[#52525B]">Replacement file</p>
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept=".csv,.xls,.xlsx,.json"
                @change="selectFile"
              />
              <button
                type="button"
                class="mt-1.5 flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[#C9CED6] bg-white px-3 text-left text-xs text-[#52525B] transition-colors hover:border-[#6F42A5]"
                @click="chooseFile"
              >
                <span class="truncate">{{ replacementFileName || 'Choose a new file…' }}</span>
                <span class="font-medium text-[#3B1770]">Browse</span>
              </button>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <label class="grid gap-1.5 text-xs font-medium text-[#52525B]">
                Quote character
                <input
                  v-model="quoteCharacter"
                  type="text"
                  maxlength="1"
                  class="h-9 rounded-md border border-[#C9CED6] px-3 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
                />
              </label>
              <label class="grid gap-1.5 text-xs font-medium text-[#52525B]">
                Delimiter
                <input
                  v-model="delimiter"
                  type="text"
                  maxlength="1"
                  class="h-9 rounded-md border border-[#C9CED6] px-3 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
                />
              </label>
            </div>

            <label class="mt-4 grid gap-1.5 text-xs font-medium text-[#52525B]">
              Records to preview
              <input
                v-model.number="previewLimit"
                type="number"
                min="1"
                max="1000"
                class="h-9 rounded-md border border-[#C9CED6] px-3 text-sm font-normal text-[#25262E] outline-none focus:border-[#6F42A5]"
              />
              <span class="font-normal text-[#8A8A8A]">Maximum 1,000 records</span>
            </label>

            <label class="mt-4 flex items-center gap-2 text-xs text-[#52525B]">
              <input v-model="hasHeaders" type="checkbox" class="h-4 w-4 accent-[#6F42A5]" />
              First row contains column headers
            </label>

            <h3 class="mt-6 border-b border-[#D8DCE2] pb-2 text-sm font-semibold text-[#25262E]">Upload settings</h3>
            <label class="mt-4 flex items-center gap-2 text-xs text-[#52525B]">
              <input v-model="replaceOnUpload" type="checkbox" class="h-4 w-4 accent-[#6F42A5]" />
              Replace existing data on upload
            </label>
          </div>

          <div class="min-w-0 p-6">
            <h3 class="border-b border-[#D8DCE2] pb-2 text-sm font-semibold text-[#25262E]">Preview</h3>
            <div class="mt-4 overflow-auto rounded-lg border border-[#E2E2E2]">
              <table v-if="preview.columns.length > 0" class="min-w-full text-left">
                <thead>
                  <tr class="bg-[#FAFAFA]">
                    <th
                      v-for="column in preview.columns"
                      :key="column"
                      class="min-w-32 border-b border-[#E2E2E2] px-3 py-2 text-xs font-semibold text-[#25262E]"
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
                      class="max-w-48 truncate border-b border-[#EAEAEA] px-3 py-2 text-xs text-[#52525B] last:border-b-0"
                    >
                      {{ row[column] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer class="flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-6 py-4">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
            :disabled="!displayName.trim()"
            @click="save"
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
