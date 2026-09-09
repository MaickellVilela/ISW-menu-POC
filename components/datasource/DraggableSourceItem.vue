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
  }>(),
  { variant: 'entity', detail: '' },
);

const secondaryText = computed(() =>
  props.detail || (
    props.variant === 'entity'
      ? `${props.item.fields.length} field${props.item.fields.length === 1 ? '' : 's'}`
      : props.item.description
  ),
);

function onDragStart(event: DragEvent): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(SOURCE_DRAG_MIME, JSON.stringify(props.item));
  event.dataTransfer.setData('text/plain', props.item.label);
}
</script>

<template>
  <li
    draggable="true"
    class="group flex cursor-grab items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:border-[#D8D8D8] hover:bg-[#FAFAFA] active:cursor-grabbing"
    :aria-label="`Drag ${item.label} to the canvas`"
    @dragstart="onDragStart"
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

    <slot name="actions"></slot>
  </li>
</template>
