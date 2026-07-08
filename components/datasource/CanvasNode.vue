<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import {
  PORT_DY,
  JOIN_RIGHT_PORT_DY,
  OUTPUT_PORT_DY,
  JOIN_COLLAPSED_LEFT_DY,
  JOIN_COLLAPSED_RIGHT_DY,
  JOIN_TYPE_LABELS,
  nodeWidth,
  type CanvasNode,
  type FieldOption,
  type JoinType,
} from '~/composables/useDataSourceCanvas';
import JoinVennIcon from './JoinVennIcon.vue';
import FieldSelect from './FieldSelect.vue';

const props = withDefaults(
  defineProps<{
    node: CanvasNode;
    isConnectTarget?: boolean;
    leftLabel?: string;
    rightLabel?: string;
    leftFields?: FieldOption[];
    rightFields?: FieldOption[];
    activeFields?: string[];
    inflowCount?: number;
  }>(),
  {
    leftLabel: '',
    rightLabel: '',
    leftFields: () => [],
    rightFields: () => [],
    activeFields: () => [],
    inflowCount: 0,
  },
);

const emit = defineEmits<{
  (e: 'start-move', payload: { id: string; event: PointerEvent }): void;
  (e: 'start-connect', payload: { id: string; event: PointerEvent }): void;
  (e: 'start-resize', payload: { id: string; event: PointerEvent }): void;
  (e: 'remove', id: string): void;
  (e: 'rename', payload: { id: string; name: string }): void;
  (e: 'toggle-collapse', id: string): void;
  (e: 'preview', id: string): void;
  (e: 'set-join-type', payload: { id: string; joinType: JoinType }): void;
  (e: 'swap-inputs', id: string): void;
  (e: 'add-condition', id: string): void;
  (e: 'update-condition', payload: { id: string; conditionId: string; side: 'leftField' | 'rightField'; value: string }): void;
  (e: 'remove-condition', payload: { id: string; conditionId: string }): void;
}>();

const isJoin = computed(() => props.node.type === 'join');
const isOutput = computed(() => props.node.type === 'output');
const joinTypes: JoinType[] = ['inner', 'left', 'full'];
const typeMenuOpen = ref(false);

/* ----------------------------- inline rename ----------------------------- */

const editing = ref(false);
const draft = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

/** Fallback shown when the card has no custom name. */
const defaultName = computed(() => (isJoin.value ? 'Join' : props.node.label));
const displayName = computed(() => props.node.customName?.trim() || defaultName.value);
/** Tables keep their original name visible (smaller) once a custom name is set. */
const showOriginalName = computed(
  () => props.node.type === 'table' && !!props.node.customName?.trim() && props.node.customName.trim() !== props.node.label,
);

async function startEdit(): Promise<void> {
  if (isOutput.value) return;
  draft.value = displayName.value;
  editing.value = true;
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
}

function commitEdit(): void {
  if (!editing.value) return;
  editing.value = false;
  const name = draft.value.trim();
  // Clearing back to the default removes the custom name entirely.
  emit('rename', { id: props.node.id, name: name === defaultName.value ? '' : name });
}

function cancelEdit(): void {
  editing.value = false;
}

/*
 * The title doubles as part of the draggable card surface. We let pointerdown
 * bubble (so a drag can start on the title) and only treat a release as a
 * rename click when the pointer barely moved.
 */
const DRAG_CLICK_THRESHOLD = 4;
const pressOrigin = ref<{ x: number; y: number } | null>(null);

function onNamePointerDown(event: PointerEvent): void {
  pressOrigin.value = { x: event.clientX, y: event.clientY };
}

function onNameClick(event: MouseEvent): void {
  const origin = pressOrigin.value;
  pressOrigin.value = null;
  if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > DRAG_CLICK_THRESHOLD) return;
  startEdit();
}

const activeSet = computed(() => new Set(props.activeFields));
// Only the output (right) dot is pinned to the header centre; the left input
// dots keep their original positions (stacked when collapsed, aligned with the
// Left/Right rows when expanded).
const outputPortDy = OUTPUT_PORT_DY;
const leftInputDy = computed(() => (props.node.collapsed ? JOIN_COLLAPSED_LEFT_DY : PORT_DY));
const rightInputDy = computed(() => (props.node.collapsed ? JOIN_COLLAPSED_RIGHT_DY : JOIN_RIGHT_PORT_DY));
const collapsedActiveFields = computed(() =>
  (props.node.fields ?? []).filter((field) => activeSet.value.has(field.name)),
);

const baseStyle = computed(() => ({
  left: `${props.node.x}px`,
  top: `${props.node.y}px`,
  width: `${nodeWidth(props.node)}px`,
}));

function onSelectType(joinType: JoinType): void {
  emit('set-join-type', { id: props.node.id, joinType });
  typeMenuOpen.value = false;
}
</script>

<template>
  <div
    :data-node-id="node.id"
    class="group absolute cursor-grab select-none rounded-lg border bg-white shadow-sm active:cursor-grabbing"
    :class="[
      isConnectTarget
        ? 'border-[#3B1770] ring-2 ring-[#3B1770]/40'
        : isOutput
          ? 'border-[#25262E]'
          : isJoin
            ? 'border-[#C9B8EC]'
            : 'border-[#D8D8D8]',
    ]"
    :style="baseStyle"
    @pointerdown="emit('start-move', { id: node.id, event: $event })"
  >
    <!-- ======================= TABLE ======================= -->
    <template v-if="node.type === 'table'">
      <header
        class="flex h-9 items-center gap-1.5 rounded-t-lg border-b border-[#EEE] bg-[#F7F9FC] pl-2 pr-4"
        :class="{ 'rounded-b-lg border-b-0': node.collapsed && !collapsedActiveFields.length }"
      >
        <button
          type="button"
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#9A9A9A] hover:bg-white hover:text-[#25262E]"
          :title="node.collapsed ? 'Expand' : 'Collapse'"
          @pointerdown.stop
          @click.stop="emit('toggle-collapse', node.id)"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': node.collapsed }" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center text-[#3B6BB5]">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18M3 14h18M9 4v16" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <input
            v-if="editing"
            ref="nameInput"
            v-model="draft"
            type="text"
            class="w-full cursor-text rounded border border-[#C9B8EC] bg-white px-1 py-0.5 text-sm font-semibold text-[#25262E] outline-none"
            @pointerdown.stop
            @keydown.enter.prevent="commitEdit"
            @keydown.esc.prevent="cancelEdit"
            @blur="commitEdit"
            @click.stop
          />
          <button
            v-else
            type="button"
            class="flex w-full flex-col items-start leading-none"
            title="Click to rename"
            @pointerdown="onNamePointerDown"
            @click.stop="onNameClick"
          >
            <span class="max-w-full truncate text-sm font-semibold text-[#25262E]">{{ displayName }}</span>
            <span v-if="showOriginalName" class="max-w-full truncate pt-0.5 text-[10px] font-normal text-[#9A9A9A]">{{ node.label }}</span>
          </button>
        </div>
        <span class="flex-shrink-0 text-[10px] text-[#9A9A9A]">{{ (node.fields ?? []).length }}</span>
      </header>

      <!-- Full, scrollable field list -->
      <ul v-if="!node.collapsed" class="max-h-44 overflow-y-auto px-2 py-1.5">
        <li
          v-for="field in node.fields"
          :key="field.name"
          class="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs"
          :class="activeSet.has(field.name) ? 'bg-[#F1ECFA]' : ''"
        >
          <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full" :class="activeSet.has(field.name) ? 'bg-[#3B1770]' : 'bg-[#C4C4C4]'" />
          <span class="flex-1 truncate" :class="activeSet.has(field.name) ? 'font-medium text-[#3B1770]' : 'text-[#5A5A5A]'">{{ field.name }}</span>
          <span class="flex-shrink-0 text-[10px] text-[#9A9A9A]">{{ field.type }}</span>
        </li>
      </ul>

      <!-- Collapsed: show only fields used in joins -->
      <ul v-else-if="collapsedActiveFields.length" class="px-2 py-1.5">
        <li
          v-for="field in collapsedActiveFields"
          :key="field.name"
          class="flex items-center gap-1.5 px-1 py-0.5 text-xs"
        >
          <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#3B1770]" />
          <span class="flex-1 truncate font-medium text-[#3B1770]">{{ field.name }}</span>
          <span class="flex-shrink-0 text-[10px] text-[#9A9A9A]">{{ field.type }}</span>
        </li>
      </ul>
    </template>

    <!-- ======================= JOIN ======================= -->
    <template v-else-if="isJoin">
      <header
        class="relative flex h-9 items-center gap-1 rounded-t-lg border-b border-[#EEE] bg-[#F5F1FC] pl-1.5 pr-2"
        :class="{ 'rounded-b-lg border-b-0': node.collapsed }"
      >
        <button
          type="button"
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#9A7BD0] hover:bg-white hover:text-[#3B1770]"
          :title="node.collapsed ? 'Expand' : 'Collapse'"
          @pointerdown.stop
          @click.stop="emit('toggle-collapse', node.id)"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': node.collapsed }" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <!-- Editable join name (left) -->
        <div class="min-w-0 flex-1">
          <input
            v-if="editing"
            ref="nameInput"
            v-model="draft"
            type="text"
            class="w-full cursor-text rounded border border-[#C9B8EC] bg-white px-1 py-0.5 text-sm font-semibold text-[#3B1770] outline-none"
            @pointerdown.stop
            @keydown.enter.prevent="commitEdit"
            @keydown.esc.prevent="cancelEdit"
            @blur="commitEdit"
            @click.stop
          />
          <button
            v-else
            type="button"
            class="max-w-full truncate rounded px-1 py-0.5 text-left text-sm font-semibold text-[#3B1770] hover:bg-white"
            title="Click to rename"
            @pointerdown="onNamePointerDown"
            @click.stop="onNameClick"
          >
            {{ displayName }}
          </button>
        </div>

        <!-- Join type (right) -->
        <button
          type="button"
          class="flex flex-shrink-0 items-center rounded p-1 hover:bg-white"
          :title="JOIN_TYPE_LABELS[node.joinType ?? 'inner']"
          @pointerdown.stop
          @click.stop="typeMenuOpen = !typeMenuOpen"
        >
          <JoinVennIcon :type="node.joinType ?? 'inner'" />
        </button>

        <!-- Join type menu -->
        <template v-if="typeMenuOpen">
          <div class="fixed inset-0 z-30" @pointerdown.stop @click.stop="typeMenuOpen = false" />
          <ul class="absolute right-1 top-9 z-40 w-36 overflow-hidden rounded-md border border-[#E2E2E2] bg-white py-1 shadow-lg" @pointerdown.stop>
            <li v-for="type in joinTypes" :key="type">
              <button
                type="button"
                class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-[#F5F1FC]"
                :class="(node.joinType ?? 'inner') === type ? 'text-[#3B1770] font-semibold' : 'text-[#5A5A5A]'"
                @click.stop="onSelectType(type)"
              >
                <JoinVennIcon :type="type" />
                {{ JOIN_TYPE_LABELS[type] }}
              </button>
            </li>
          </ul>
        </template>
      </header>

      <!-- Left / Right inputs + swap -->
      <div v-if="!node.collapsed" class="flex items-center justify-between gap-2 px-3 pt-1.5 text-xs">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 py-0.5">
            <span class="font-semibold uppercase tracking-wide text-[#3B6BB5]">Left</span>
            <span class="truncate text-[#5A5A5A]">{{ leftLabel || 'not connected' }}</span>
          </div>
          <div class="flex items-center gap-1.5 py-0.5">
            <span class="font-semibold uppercase tracking-wide text-[#8B5CF6]">Right</span>
            <span class="truncate text-[#5A5A5A]">{{ rightLabel || 'not connected' }}</span>
          </div>
        </div>
        <button
          type="button"
          title="Swap Left / Right"
          class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[#9A7BD0] hover:bg-[#EDE6FA] hover:text-[#3B1770]"
          @pointerdown.stop
          @click.stop="emit('swap-inputs', node.id)"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h11l-3-3m3 3l-3 3M17 17H6l3-3m-3 3l3 3" /></svg>
        </button>
      </div>

      <!-- Conditions -->
      <div v-if="!node.collapsed" class="border-t border-[#EEE] px-2.5 py-2">
        <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Match on</p>
        <div
          v-for="condition in node.conditions"
          :key="condition.id"
          class="mb-1 flex items-center gap-1"
        >
          <FieldSelect
            class="flex-1"
            :model-value="condition.leftField"
            :options="leftFields"
            placeholder="Left field…"
            accent="#3B6BB5"
            @update:model-value="emit('update-condition', { id: node.id, conditionId: condition.id, side: 'leftField', value: $event })"
          />
          <span class="text-[#9A9A9A]">=</span>
          <FieldSelect
            class="flex-1"
            :model-value="condition.rightField"
            :options="rightFields"
            placeholder="Right field…"
            accent="#8B5CF6"
            @update:model-value="emit('update-condition', { id: node.id, conditionId: condition.id, side: 'rightField', value: $event })"
          />
          <button
            v-if="(node.conditions?.length ?? 0) > 1"
            type="button"
            title="Remove condition"
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#9A9A9A] hover:bg-[#F1F1F1] hover:text-[#25262E]"
            @pointerdown.stop
            @click.stop="emit('remove-condition', { id: node.id, conditionId: condition.id })"
          >
            ×
          </button>
        </div>

        <div class="mt-1 flex items-center justify-between">
          <button
            type="button"
            class="flex items-center gap-1 text-[11px] font-medium text-[#3B1770] hover:underline"
            @pointerdown.stop
            @click.stop="emit('add-condition', node.id)"
          >
            <span class="text-sm leading-none">+</span> Add condition
          </button>
          <button
            type="button"
            title="Preview join result"
            class="flex items-center rounded p-0.5 text-[#5A5A5A] hover:text-[#3B1770]"
            @pointerdown.stop
            @click.stop="emit('preview', node.id)"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
        </div>
      </div>
    </template>

    <!-- ======================= OUTPUT ======================= -->
    <template v-else>
      <header
        class="flex h-9 items-center gap-2 rounded-t-lg bg-[#25262E] px-2.5 text-white"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
        </svg>
        <span class="flex-1 text-sm font-semibold">Output</span>
      </header>
      <div class="flex items-start justify-between gap-2 px-3 py-2 text-xs text-[#6B6B6B]">
        <div class="min-w-0">
          <p>Final dataset</p>
          <p class="mt-0.5 text-[#9A9A9A]">
            {{ inflowCount > 0 ? `${inflowCount} columns` : 'Connect a join or table here' }}
          </p>
        </div>
        <button
          type="button"
          title="Preview output"
          class="flex flex-shrink-0 items-center rounded p-0.5 text-[#9A9A9A] hover:text-[#3B1770]"
          @pointerdown.stop
          @click.stop="emit('preview', node.id)"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>
      </div>
    </template>

    <!-- Resize width (right edge; ports still sit on top at their band) -->
    <span
      class="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize"
      title="Drag to resize width"
      @pointerdown.stop="emit('start-resize', { id: node.id, event: $event })"
    />

    <!-- Remove (not for output) -->
    <button
      v-if="!isOutput"
      type="button"
      class="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-[#25262E] text-white text-xs leading-none hover:bg-[#3B1770] group-hover:flex"
      title="Remove"
      @pointerdown.stop
      @click.stop="emit('remove', node.id)"
    >
      ×
    </button>

    <!-- Input ports -->
    <span
      v-if="isJoin"
      class="absolute -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-[#3B6BB5]"
      :style="{ top: `${leftInputDy}px` }"
    />
    <span
      v-if="isJoin"
      class="absolute -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-[#8B5CF6]"
      :style="{ top: `${rightInputDy}px` }"
    />
    <span
      v-if="isOutput"
      class="absolute -left-1.5 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#25262E]"
      :style="{ top: `${PORT_DY}px` }"
    />

    <!-- Output port (drag to another node to join, or onto Output) -->
    <button
      v-if="!isOutput"
      type="button"
      title="Drag onto another element to join, or onto Output"
      class="absolute -right-1.5 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white transition-transform hover:scale-110"
      :class="isJoin ? 'bg-[#3B1770]' : 'bg-[#3B6BB5]'"
      :style="{ top: `${outputPortDy}px` }"
      @pointerdown.stop="emit('start-connect', { id: node.id, event: $event })"
      @click.stop
    />
  </div>
</template>
