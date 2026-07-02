<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import type { FieldOption } from '~/composables/useDataSourceCanvas';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: FieldOption[];
    placeholder?: string;
    accent?: string;
  }>(),
  { placeholder: 'Select field', accent: '#3B6BB5' },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const open = ref(false);
const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const selected = computed(() => props.options.find((option) => option.value === props.modelValue));

const displayLabel = computed(() => {
  if (selected.value) return selected.value.name;
  if (props.modelValue.includes('.')) return props.modelValue.split('.').pop() ?? props.modelValue;
  return '';
});

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  const list = term
    ? props.options.filter((option) => option.name.toLowerCase().includes(term))
    : [...props.options];
  return list.sort((a, b) => a.name.localeCompare(b.name));
});

function toggle(): void {
  open.value = !open.value;
  if (open.value) {
    query.value = '';
    nextTick(() => searchInput.value?.focus());
  }
}

function choose(option: FieldOption): void {
  emit('update:modelValue', option.value);
  open.value = false;
}
</script>

<template>
  <div class="relative min-w-0" @pointerdown.stop @click.stop>
    <button
      type="button"
      class="flex w-full items-center gap-1 rounded border bg-white px-1.5 py-1 text-[11px]"
      :class="open ? 'border-[#3B1770] ring-1 ring-[#3B1770]/30' : 'border-[#E2E2E2]'"
      :style="{ color: accent }"
      :title="selected ? selected.value : placeholder"
      @click="toggle"
    >
      <span class="flex-1 truncate text-left" :class="{ 'text-[#9A9A9A]': !displayLabel }">
        {{ displayLabel || placeholder }}
      </span>
      <svg viewBox="0 0 24 24" class="h-3 w-3 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-30" @pointerdown.stop @click.stop="open = false" />
      <div class="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-md border border-[#E2E2E2] bg-white shadow-lg">
        <div class="border-b border-[#EEE] p-1.5">
          <div class="flex items-center gap-1.5 rounded border border-[#E2E2E2] px-2 py-1">
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              placeholder="Filter…"
              class="w-full text-[12px] text-[#25262E] focus:outline-none"
            />
          </div>
        </div>
        <ul class="max-h-56 overflow-y-auto py-1">
          <li v-if="!filtered.length" class="px-3 py-2 text-[11px] text-[#9A9A9A]">No matching fields</li>
          <li v-for="option in filtered" :key="option.value">
            <button
              type="button"
              class="flex w-full flex-col px-3 py-1.5 text-left hover:bg-[#F5F1FC]"
              :class="{ 'bg-[#F1ECFA]': option.value === modelValue }"
              @click="choose(option)"
            >
              <span class="text-[13px] font-medium leading-tight text-[#25262E]">{{ option.name }}</span>
              <span class="text-[11px] leading-tight text-[#9A9A9A]">{{ option.type }}</span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
