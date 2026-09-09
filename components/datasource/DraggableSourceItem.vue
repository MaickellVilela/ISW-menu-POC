<script setup lang="ts">
import { computed } from 'vue';
import {
  SOURCE_DRAG_MIME,
  type SourceItem,
} from '~/composables/useDataSourceCanvas';

const props = withDefaults(
  defineProps<{
    item: SourceItem;
    variant?: 'entity' | 'file';
    detail?: string;
    mode?: 'drag' | 'select';
    selected?: boolean;
  }>(),
  {
    variant: 'entity',
    detail: '',
    mode: 'drag',
    selected: false,
  },
);

const emit = defineEmits<{
  select: [item: SourceItem];
}>();

const secondaryText = computed(() =>
  props.detail || (
    props.variant === 'entity'
      ? `${props.item.fields.length} field${props.item.fields.length === 1 ? '' : 's'}`
      : props.item.description
  ),
);

function onDragStart(event: DragEvent): void {
  if (props.mode !== 'drag') return;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(SOURCE_DRAG_MIME, JSON.stringify(props.item));
  event.dataTransfer.setData('text/plain', props.item.label);
}
</script>

<template>
  <li
    :draggable="mode === 'drag'"
    :role="mode === 'select' ? 'option' : undefined"
    :tabindex="mode === 'select' ? 0 : undefined"
    class="group flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors"
    :class="[
      mode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      selected
        ? 'border-[#6F42A5] bg-[#F1ECFA]'
        : 'border-transparent hover:border-[#D8D8D8] hover:bg-[#FAFAFA]',
    ]"
    :aria-label="mode === 'drag' ? `Drag ${item.label} to the canvas` : `Select ${item.label}`"
    :aria-selected="mode === 'select' ? selected : undefined"
    @click="mode === 'select' && emit('select', item)"
    @dragstart="onDragStart"
    @keydown.enter.prevent="mode === 'select' && emit('select', item)"
    @keydown.space.prevent="mode === 'select' && emit('select', item)"
  >
    <span
      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
      :class="variant === 'entity' ? 'bg-[#F1ECFA] text-[#3B1770]' : 'bg-[#F3F4F6] text-[#52525B]'"
    >
      <svg
        v-if="variant === 'entity'"
        viewBox="0 0 24 24"
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
        <path d="M3.5 9h17M3.5 14h17M9 4v16" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="M7 3.5h7l4 4V20H7V3.5Z" stroke-linejoin="round" />
        <path d="M14 3.5V8h4M10 12h5M10 15.5h5" stroke-linecap="round" />
      </svg>
    </span>

    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-medium text-[#25262E]">{{ item.label }}</span>
      <span class="mt-0.5 block truncate text-[11px] text-[#7A7A7A]">{{ secondaryText }}</span>
    </span>

    <slot name="actions">
      <span
        v-if="mode === 'select'"
        class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border"
        :class="selected ? 'border-[#6F42A5] bg-[#6F42A5] text-white' : 'border-[#BFC6CF] bg-white'"
        aria-hidden="true"
      >
        <svg v-if="selected" viewBox="0 0 12 12" class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m2.5 6 2 2 5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </slot>
  </li>
</template>
