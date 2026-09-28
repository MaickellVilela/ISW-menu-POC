<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { OutputFieldCandidate } from '~/composables/useDataSourceCanvas';

const props = withDefaults(
  defineProps<{
    open: boolean;
    fieldOptions?: OutputFieldCandidate[];
  }>(),
  { fieldOptions: () => [] },
);

const emit = defineEmits<{
  cancel: [];
  save: [payload: { label: string; parentField: string; childField: string; labelField?: string }];
}>();

const labelInput = ref<HTMLInputElement | null>(null);
const label = ref('');
const parentField = ref('');
const childField = ref('');
const labelField = ref('');

const childOptions = computed(() => props.fieldOptions.filter((option) => option.value !== parentField.value));
const canSave = computed(() => label.value.trim() !== '' && parentField.value !== '' && childField.value !== '');

function reset(): void {
  label.value = 'Untitled Hierarchy Field';
  parentField.value = '';
  childField.value = '';
  labelField.value = '';
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    reset();
    await nextTick();
    labelInput.value?.focus();
    labelInput.value?.select();
  },
);

watch(parentField, (value) => {
  if (childField.value === value) childField.value = '';
});

function save(): void {
  if (!canSave.value) return;
  emit('save', {
    label: label.value.trim(),
    parentField: parentField.value,
    childField: childField.value,
    labelField: labelField.value || undefined,
  });
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
        aria-labelledby="hierarchy-field-title"
      >
        <header class="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <h2 id="hierarchy-field-title" class="text-lg font-semibold text-[#25262E]">Add Hierarchy Field</h2>
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
          <label class="block">
            <span class="mb-1 block text-xs font-medium text-[#52525B]">Label<span class="text-[#C62828]">*</span></span>
            <input
              ref="labelInput"
              v-model="label"
              type="text"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-medium text-[#52525B]">Parent Field<span class="text-[#C62828]">*</span></span>
            <select
              v-model="parentField"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            >
              <option value="" disabled>Select Field</option>
              <option v-for="option in fieldOptions" :key="option.value" :value="option.value">{{ option.name }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-medium text-[#52525B]">Child Field<span class="text-[#C62828]">*</span></span>
            <select
              v-model="childField"
              :disabled="!parentField"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770] disabled:bg-[#FAFAFA] disabled:text-[#9A9A9A]"
            >
              <option value="" disabled>Select Field</option>
              <option v-for="option in childOptions" :key="option.value" :value="option.value">{{ option.name }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-medium text-[#52525B]">Label Field</span>
            <select
              v-model="labelField"
              class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            >
              <option value="">Select Field</option>
              <option v-for="option in fieldOptions" :key="option.value" :value="option.value">{{ option.name }}</option>
            </select>
          </label>
        </div>

        <footer class="mt-1 flex justify-end gap-2 border-t border-[#E2E2E2] px-5 py-3">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('cancel')"
          >
            Close
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
