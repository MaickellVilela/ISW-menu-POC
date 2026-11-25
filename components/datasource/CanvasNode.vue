<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  globalFilterShortcut,
  globalFiltersPageShortcut,
  performanceFilterShortcut,
  type CanvasFilterShortcut,
} from '~/composables/canvasFilterShortcuts';
import {
  CARD_HIGHLIGHT_MS,
  PORT_DY,
  JOIN_RIGHT_PORT_DY,
  OUTPUT_PORT_DY,
  JOIN_COLLAPSED_LEFT_DY,
  JOIN_COLLAPSED_RIGHT_DY,
  JOIN_TYPE_LABELS,
  nodeWidth,
  resolvedTableSourceId,
  isJoinIncomplete,
  isJoinFieldBlank,
  fieldEntities,
  joinSideEntity,
  outputListHeight,
  type CanvasNode,
  type FieldDef,
  type FieldOption,
  type JoinSide,
  type JoinType,
  type OutputFieldRow,
  type ResizeAxis,
} from '~/composables/useDataSourceCanvas';
import JoinVennIcon from './JoinVennIcon.vue';
import FieldSelect from './FieldSelect.vue';
import ToggleSwitch from './ToggleSwitch.vue';

const props = withDefaults(
  defineProps<{
    node: CanvasNode;
    isConnectTarget?: boolean;
    leftLabel?: string;
    rightLabel?: string;
    leftFields?: FieldOption[];
    rightFields?: FieldOption[];
    activeFields?: string[];
    /** Output card only: the fields it lists, each with its Visible state. */
    outputFields?: OutputFieldRow[];
    inflowCount?: number;
    hasPerformanceFilter?: boolean;
    filteredFieldIds?: Record<string, string>;
    hasOutputFilter?: boolean;
    /** Funnel buttons that jump to filter settings; off when the host has no settings. */
    filterShortcuts?: boolean;
    selected?: boolean;
    saveError?: boolean;
    shakeToken?: number;
    /** Changing to a new positive value plays the "updated" highlight. */
    highlightToken?: number;
  }>(),
  {
    filterShortcuts: true,
    highlightToken: 0,
    leftLabel: '',
    rightLabel: '',
    leftFields: () => [],
    rightFields: () => [],
    activeFields: () => [],
    outputFields: () => [],
    inflowCount: 0,
    hasPerformanceFilter: false,
    filteredFieldIds: () => ({}),
    hasOutputFilter: false,
    selected: false,
    saveError: false,
    shakeToken: 0,
  },
);

const emit = defineEmits<{
  (e: 'start-move', payload: { id: string; event: PointerEvent }): void;
  (e: 'start-connect', payload: { id: string; event: PointerEvent }): void;
  (e: 'start-resize', payload: { id: string; event: PointerEvent; axis?: ResizeAxis }): void;
  (e: 'remove', id: string): void;
  (e: 'rename', payload: { id: string; name: string }): void;
  (e: 'toggle-collapse', id: string): void;
  (e: 'preview', id: string): void;
  (e: 'set-join-type', payload: { id: string; joinType: JoinType }): void;
  (e: 'swap-inputs', id: string): void;
  (e: 'add-condition', id: string): void;
  (e: 'update-condition', payload: { id: string; conditionId: string; side: 'leftField' | 'rightField'; value: string }): void;
  (e: 'remove-condition', payload: { id: string; conditionId: string }): void;
  (e: 'set-dimension', payload: { id: string; side: JoinSide; enabled: boolean }): void;
  (e: 'set-condition-entity', payload: { id: string; side: JoinSide; entity: string }): void;
  (e: 'set-field-visibility', payload: { keys: string[]; visible: boolean }): void;
  (e: 'filter-shortcut', shortcut: CanvasFilterShortcut): void;
}>();

const isJoin = computed(() => props.node.type === 'join');
const isOutput = computed(() => props.node.type === 'output');
const joinNeedsMatch = computed(() => isJoinIncomplete(props.node));
const joinSaveError = computed(() => props.saveError && joinNeedsMatch.value);
const shaking = ref(false);

watch(
  () => props.shakeToken,
  async (token, previous) => {
    if (!joinSaveError.value || token === previous) return;
    shaking.value = false;
    await nextTick();
    shaking.value = true;
  },
);

function onShakeEnd(event: AnimationEvent): void {
  if (event.target !== event.currentTarget) return;
  shaking.value = false;
}

const highlighted = ref(false);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

function clearHighlightTimer(): void {
  if (highlightTimer !== null) clearTimeout(highlightTimer);
  highlightTimer = null;
}

watch(
  () => props.highlightToken,
  async (token, previous) => {
    if (token <= 0 || token === previous) return;
    clearHighlightTimer();
    // Off for a tick so a repeat on the same card restarts the animation.
    highlighted.value = false;
    await nextTick();
    highlighted.value = true;
    highlightTimer = setTimeout(() => {
      highlighted.value = false;
      highlightTimer = null;
    }, CARD_HIGHLIGHT_MS);
  },
  { immediate: true },
);

onBeforeUnmount(clearHighlightTimer);
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
const filteredFieldSet = computed(() => new Set(Object.keys(props.filteredFieldIds)));
const collapsedVisibleFields = computed(() =>
  (props.node.fields ?? []).filter(
    (field) => activeSet.value.has(field.name) || filteredFieldSet.value.has(field.name),
  ),
);
// Only the output (right) dot is pinned to the header centre; the left input
// dots keep their original positions (stacked when collapsed, aligned with the
// Left/Right rows when expanded).
const outputPortDy = OUTPUT_PORT_DY;
const leftInputDy = computed(() => (props.node.collapsed ? JOIN_COLLAPSED_LEFT_DY : PORT_DY));
const rightInputDy = computed(() => (props.node.collapsed ? JOIN_COLLAPSED_RIGHT_DY : JOIN_RIGHT_PORT_DY));

const baseStyle = computed(() => ({
  left: `${props.node.x}px`,
  top: `${props.node.y}px`,
  width: `${nodeWidth(props.node)}px`,
}));

function onSelectType(joinType: JoinType): void {
  emit('set-join-type', { id: props.node.id, joinType });
  typeMenuOpen.value = false;
}

function isFieldFiltered(field: FieldDef): boolean {
  return filteredFieldSet.value.has(field.name);
}

function isJoinKey(field: FieldDef): boolean {
  return activeSet.value.has(field.name);
}

/*
 * Colour code on the canvas. Header colour is the card type (table grey, Join
 * lilac, Output black); these three states each have their own hue:
 *   - purple / lilac row  = field used in a join
 *   - teal                = global filter (field row, and the Output's funnel)
 *   - blue                = performance filter on a table (header line + funnel)
 * A field that is both a join key and filtered keeps the lilac row and still
 * shows the teal funnel.
 */
function fieldRowClass(field: FieldDef): string {
  if (isJoinKey(field)) return 'bg-[#F1ECFA]';
  return isFieldFiltered(field) ? 'bg-[#EEF9F7]' : '';
}

function fieldDotClass(field: FieldDef): string {
  if (isJoinKey(field)) return 'bg-[#3B1770]';
  return isFieldFiltered(field) ? 'bg-[#009E8F]' : 'bg-[#C4C4C4]';
}

function fieldNameClass(field: FieldDef): string {
  if (isJoinKey(field)) return 'font-medium text-[#3B1770]';
  return isFieldFiltered(field) ? 'font-medium text-[#0B5F5A]' : 'text-[#5A5A5A]';
}

function fieldRowTitle(field: FieldDef): string | undefined {
  const notes = [
    isJoinKey(field) ? 'Used in a join' : '',
    isFieldFiltered(field) ? 'Global filter applied' : '',
  ].filter(Boolean);
  return notes.length ? notes.join(' · ') : undefined;
}

function funnelButtonClass(active: boolean, hover: 'card' | 'field'): string {
  const hoverClass = hover === 'card'
    ? 'group-hover/card:opacity-100'
    : 'group-hover/field:opacity-100';
  if (active) {
    // Field-level (global filter) is teal; the table header's performance filter is blue.
    const tone = hover === 'field' ? 'bg-[#D3F0EC] text-[#0B5F5A]' : 'bg-[#D9ECFC] text-[#0A5CB0]';
    return `flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${tone} opacity-100`;
  }
  return `flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#3B1770] opacity-0 transition-opacity hover:bg-white ${hoverClass} focus-visible:opacity-100`;
}

/* ------------------------- join sides: entity + dimension ------------------------- */

const dimensionMenuOpen = ref(false);
const hasDimension = computed(() => !!(props.node.dimensionEntity?.left || props.node.dimensionEntity?.right));

const sideFields = computed<Record<JoinSide, FieldOption[]>>(() => ({
  left: props.leftFields,
  right: props.rightFields,
}));

/** Entities reachable on each side: more than one means the side is a join result. */
const sideEntities = computed<Record<JoinSide, string[]>>(() => ({
  left: fieldEntities(props.leftFields),
  right: fieldEntities(props.rightFields),
}));

const sideEntity = computed<Record<JoinSide, string>>(() => ({
  left: joinSideEntity(props.node, 'left', props.leftFields),
  right: joinSideEntity(props.node, 'right', props.rightFields),
}));

/** Condition dropdowns list one entity per side, since a side can't mix entities. */
const sideOptions = computed<Record<JoinSide, FieldOption[]>>(() => {
  const optionsFor = (side: JoinSide): FieldOption[] =>
    sideEntities.value[side].length > 1
      ? sideFields.value[side].filter((field) => field.entity === sideEntity.value[side])
      : sideFields.value[side];
  return { left: optionsFor('left'), right: optionsFor('right') };
});

const joinSides = computed(() =>
  (['left', 'right'] as const).map((side) => {
    const label = side === 'left' ? props.leftLabel : props.rightLabel;
    return {
      side,
      title: side === 'left' ? 'Left' : 'Right',
      color: side === 'left' ? '#3B6BB5' : '#8B5CF6',
      label: label || 'not connected',
      connected: !!label,
      entities: sideEntities.value[side],
      entity: sideEntity.value[side],
      /** What the side is called in the dimension popover: the entity it matches on. */
      name: sideEntities.value[side].length > 1 ? sideEntity.value[side] : (label || 'not connected'),
      dimension: !!props.node.dimensionEntity?.[side],
    };
  }),
);

function onSelectSideEntity(side: JoinSide, event: Event): void {
  emit('set-condition-entity', {
    id: props.node.id,
    side,
    entity: (event.target as HTMLSelectElement).value,
  });
}

/* ------------------------------ output fields ------------------------------ */

const visibleOutputCount = computed(() => props.outputFields.filter((row) => row.visible).length);

/** The field list is open, so its height can be dragged (collapsing keeps the chosen height). */
const outputListOpen = computed(
  () => isOutput.value && !props.node.collapsed && props.outputFields.length > 0,
);
const outputListStyle = computed(() => ({
  maxHeight: `${outputListHeight(props.node, props.outputFields.length)}px`,
}));

/** Labels shared by several output fields get their entity appended to tell them apart. */
const repeatedOutputLabels = computed(() => {
  const counts = new Map<string, number>();
  for (const row of props.outputFields) counts.set(row.label, (counts.get(row.label) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count > 1).map(([label]) => label));
});

function openPerformanceFilters(): void {
  emit(
    'filter-shortcut',
    performanceFilterShortcut(resolvedTableSourceId(props.node), props.hasPerformanceFilter),
  );
}

function openGlobalFilter(field: FieldDef): void {
  emit(
    'filter-shortcut',
    globalFilterShortcut(props.node.label, field, props.filteredFieldIds[field.name]),
  );
}

function openOutputFilters(): void {
  emit('filter-shortcut', globalFiltersPageShortcut());
}
</script>

<template>
  <div
    :data-node-id="node.id"
    class="group/card absolute cursor-grab select-none rounded-lg border bg-white shadow-sm active:cursor-grabbing"
    :class="[
      { 'join-save-shake': shaking },
      isConnectTarget
        ? 'border-[#3B1770] ring-2 ring-[#3B1770]/40'
        : joinSaveError
          ? 'border-[#C81E1E] ring-2 ring-[#C81E1E]/30'
        : selected
          ? 'border-[#3B1770] ring-2 ring-[#3B1770]/25'
        : isOutput
          ? 'border-[#25262E]'
          : joinNeedsMatch
            ? 'border-[#C9780A] ring-2 ring-[#C9780A]/30'
            : isJoin
              ? 'border-[#C9B8EC]'
              : 'border-[#D8D8D8]',
    ]"
    :style="baseStyle"
    :aria-invalid="joinSaveError ? true : undefined"
    @animationend="onShakeEnd"
    @pointerdown="emit('start-move', { id: node.id, event: $event })"
  >
    <!-- ======================= TABLE ======================= -->
    <!--
      Header colour says what the card is, so a table never borrows the Join lilac.
      A performance filter shows as a blue line along the top plus the blue funnel chip.
    -->
    <template v-if="node.type === 'table'">
      <header
        class="flex h-9 items-center gap-1.5 rounded-t-lg border-b pl-2 pr-4"
        :class="[
          'border-[#EEE] bg-[#F7F9FC]',
          { 'shadow-[inset_0_2px_0_0_#1E88E5]': hasPerformanceFilter },
          { 'rounded-b-lg border-b-0': node.collapsed && !collapsedVisibleFields.length },
        ]"
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
        <button
          v-if="filterShortcuts"
          type="button"
          :class="funnelButtonClass(hasPerformanceFilter, 'card')"
          :title="hasPerformanceFilter ? 'Performance filters applied' : 'Performance filters'"
          :aria-label="hasPerformanceFilter ? 'Open applied performance filters' : 'Open performance filters'"
          :aria-pressed="hasPerformanceFilter"
          @pointerdown.stop
          @click.stop="openPerformanceFilters"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" stroke-linejoin="round" />
          </svg>
        </button>
        <span class="flex-shrink-0 text-[10px] text-[#9A9A9A]">{{ (node.fields ?? []).length }}</span>
      </header>

      <!-- Full, scrollable field list -->
      <ul v-if="!node.collapsed" class="max-h-44 overflow-x-hidden overflow-y-auto px-2 py-1.5">
        <li
          v-for="field in node.fields"
          :key="field.name"
          class="group/field flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-xs"
          :class="fieldRowClass(field)"
          :title="fieldRowTitle(field)"
        >
          <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full" :class="fieldDotClass(field)" />
          <span class="min-w-0 flex-1 truncate" :class="fieldNameClass(field)">{{ field.name }}</span>
          <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <button
              v-if="filterShortcuts"
              type="button"
              :class="funnelButtonClass(isFieldFiltered(field), 'field')"
              :title="isFieldFiltered(field) ? `Global filter applied · ${field.name}` : `Global filters · ${field.name}`"
              :aria-label="isFieldFiltered(field) ? `Open applied global filter for ${field.name}` : `Open global filters for ${field.name}`"
              :aria-pressed="isFieldFiltered(field)"
              @pointerdown.stop
              @click.stop="openGlobalFilter(field)"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" stroke-linejoin="round" />
              </svg>
            </button>
          </span>
          <span class="w-14 flex-shrink-0 text-right text-[10px] text-[#9A9A9A]">{{ field.type }}</span>
        </li>
      </ul>

      <!-- Collapsed: show only fields used in joins or carrying a global filter -->
      <ul v-else-if="collapsedVisibleFields.length" class="px-2 py-1.5">
        <li
          v-for="field in collapsedVisibleFields"
          :key="field.name"
          class="group/field flex min-w-0 items-center gap-1.5 px-1 py-0.5 text-xs"
          :title="fieldRowTitle(field)"
        >
          <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full" :class="fieldDotClass(field)" />
          <span class="min-w-0 flex-1 truncate" :class="fieldNameClass(field)">{{ field.name }}</span>
          <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <button
              v-if="filterShortcuts"
              type="button"
              :class="funnelButtonClass(isFieldFiltered(field), 'field')"
              :title="isFieldFiltered(field) ? `Global filter applied · ${field.name}` : `Global filters · ${field.name}`"
              :aria-label="isFieldFiltered(field) ? `Open applied global filter for ${field.name}` : `Open global filters for ${field.name}`"
              :aria-pressed="isFieldFiltered(field)"
              @pointerdown.stop
              @click.stop="openGlobalFilter(field)"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" stroke-linejoin="round" />
              </svg>
            </button>
          </span>
          <span class="w-14 flex-shrink-0 text-right text-[10px] text-[#9A9A9A]">{{ field.type }}</span>
        </li>
      </ul>
    </template>

    <!-- ======================= JOIN ======================= -->
    <template v-else-if="isJoin">
      <header
        class="relative flex h-9 items-center gap-1 rounded-t-lg border-b pl-1.5 pr-2"
        :class="[
          joinSaveError
            ? 'border-[#F0C7C7] bg-[#FEF3F2]'
            : joinNeedsMatch
              ? 'border-[#F0D4A8] bg-[#FFF6E8]'
              : 'border-[#EEE] bg-[#F5F1FC]',
          { 'rounded-b-lg border-b-0': node.collapsed },
        ]"
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
        <span
          v-if="joinNeedsMatch"
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          :class="joinSaveError ? 'bg-[#C81E1E]' : 'bg-[#C9780A]'"
          title="Specify matching columns"
          aria-label="Join needs matching columns"
        >
          !
        </span>
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
      <div v-if="!node.collapsed" class="relative flex items-center justify-between gap-1.5 px-3 pt-1.5 text-xs">
        <div class="min-w-0 flex-1">
          <div v-for="item in joinSides" :key="item.side" class="flex h-5 items-center gap-1.5">
            <span class="flex-shrink-0 font-semibold uppercase tracking-wide" :style="{ color: item.color }">{{ item.title }}</span>
            <!-- A join result spans several entities; conditions on this side use one of them. -->
            <select
              v-if="item.entities.length > 1"
              :value="item.entity"
              class="h-5 min-w-0 flex-1 cursor-pointer rounded border border-[#E2E2E2] bg-white px-0.5 text-xs text-[#25262E] outline-none focus:border-[#3B1770]"
              :title="`${item.label}: match on fields from one entity`"
              :aria-label="`${item.title} entity to match on`"
              @pointerdown.stop
              @click.stop
              @change="onSelectSideEntity(item.side, $event)"
            >
              <option v-for="entity in item.entities" :key="entity" :value="entity">{{ entity }}</option>
            </select>
            <span v-else class="truncate text-[#5A5A5A]">{{ item.label }}</span>
            <span
              v-if="item.dimension"
              class="flex-shrink-0 rounded bg-[#3B1770] px-1 text-[9px] font-semibold leading-[14px] tracking-wide text-white"
              title="Dimension entity"
            >DIM</span>
          </div>
        </div>
        <div class="flex flex-shrink-0 items-center">
          <button
            type="button"
            title="Swap Left / Right"
            class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[#9A7BD0] hover:bg-[#EDE6FA] hover:text-[#3B1770]"
            @pointerdown.stop
            @click.stop="emit('swap-inputs', node.id)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h11l-3-3m3 3l-3 3M17 17H6l3-3m-3 3l3 3" /></svg>
          </button>
          <button
            type="button"
            title="Dimension entity"
            aria-label="Dimension entity options"
            :aria-expanded="dimensionMenuOpen"
            class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-[#EDE6FA] hover:text-[#3B1770]"
            :class="hasDimension || dimensionMenuOpen ? 'bg-[#EDE6FA] text-[#3B1770]' : 'text-[#9A7BD0]'"
            @pointerdown.stop
            @click.stop="dimensionMenuOpen = !dimensionMenuOpen"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 4v5m0 4v7M12 4v10m0 4v2M18 4v2m0 4v10" />
              <path d="M4 11h4M10 16h4M16 8h4" />
            </svg>
          </button>
        </div>

        <!-- Dimension entity popover -->
        <template v-if="dimensionMenuOpen">
          <div class="fixed inset-0 z-30" @pointerdown.stop @click.stop="dimensionMenuOpen = false" />
          <div
            class="absolute right-2 top-full z-40 mt-1 w-60 cursor-default rounded-md border border-[#E2E2E2] bg-white p-3 shadow-lg"
            role="dialog"
            aria-label="Dimension entity"
            @pointerdown.stop
            @click.stop
          >
            <p class="text-xs font-semibold text-[#25262E]">Dimension entity</p>
            <div
              v-for="item in joinSides"
              :key="item.side"
              class="mt-2 flex items-center justify-between gap-2"
            >
              <span class="flex min-w-0 items-center gap-1.5 text-xs">
                <span class="flex-shrink-0 font-semibold uppercase tracking-wide" :style="{ color: item.color }">{{ item.title }}</span>
                <span class="truncate text-[#25262E]">{{ item.name }}</span>
              </span>
              <ToggleSwitch
                size="sm"
                :model-value="item.dimension"
                :disabled="!item.connected"
                :label="`Treat ${item.name} as a dimension entity`"
                @update:model-value="emit('set-dimension', { id: node.id, side: item.side, enabled: $event })"
              />
            </div>
            <p class="mt-2.5 border-t border-[#EEE] pt-2 text-[11px] leading-snug text-[#667085]">
              Lets queries drop this entity when it is an edge table (joined to only one other table) and none of its fields are referenced. Speeds up star schemas by skipping joins that aren't needed.
            </p>
          </div>
        </template>
      </div>

      <!-- Conditions -->
      <div v-if="!node.collapsed" class="border-t border-[#EEE] px-2.5 py-2">
        <p
          v-if="joinNeedsMatch"
          class="mb-2 rounded-md px-2 py-1 text-[11px] font-medium leading-snug"
          :class="joinSaveError ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#FFF6E8] text-[#8A4B08]'"
        >
          Specify matching columns
        </p>
        <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Match on</p>
        <div
          v-for="condition in node.conditions"
          :key="condition.id"
          class="mb-1 flex items-center gap-1"
        >
          <FieldSelect
            class="flex-1"
            :model-value="condition.leftField"
            :options="sideOptions.left"
            placeholder="Left field…"
            accent="#3B6BB5"
            :invalid="joinSaveError && isJoinFieldBlank(condition.leftField)"
            @update:model-value="emit('update-condition', { id: node.id, conditionId: condition.id, side: 'leftField', value: $event })"
          />
          <span class="text-[#9A9A9A]">=</span>
          <FieldSelect
            class="flex-1"
            :model-value="condition.rightField"
            :options="sideOptions.right"
            placeholder="Right field…"
            accent="#8B5CF6"
            :invalid="joinSaveError && isJoinFieldBlank(condition.rightField)"
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
        class="flex h-9 items-center gap-1.5 rounded-t-lg bg-[#25262E] pl-2 pr-2.5 text-white"
      >
        <button
          v-if="outputFields.length"
          type="button"
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white"
          :title="node.collapsed ? 'Show output fields' : 'Hide output fields'"
          :aria-expanded="!node.collapsed"
          @pointerdown.stop
          @click.stop="emit('toggle-collapse', node.id)"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': node.collapsed }" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <svg viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
        </svg>
        <span class="flex-1 text-sm font-semibold">Output</span>
        <button
          v-if="filterShortcuts"
          type="button"
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
          :class="
            hasOutputFilter
              ? 'bg-[#D3F0EC] text-[#0B5F5A] opacity-100'
              : 'text-white/80 opacity-0 transition-opacity hover:bg-white/10 group-hover/card:opacity-100 focus-visible:opacity-100'
          "
          :title="hasOutputFilter ? 'Global filters applied to this output' : 'Global filters'"
          :aria-label="hasOutputFilter ? 'Open applied global filters' : 'Open global filters'"
          :aria-pressed="hasOutputFilter"
          @pointerdown.stop
          @click.stop="openOutputFilters"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" stroke-linejoin="round" />
          </svg>
        </button>
      </header>
      <div class="flex items-start justify-between gap-2 px-3 py-2 text-xs text-[#6B6B6B]">
        <div class="min-w-0">
          <p>Final dataset</p>
          <p class="mt-0.5 text-[#9A9A9A]">
            <template v-if="outputFields.length">{{ visibleOutputCount }} of {{ outputFields.length }} fields visible</template>
            <template v-else>{{ inflowCount > 0 ? `${inflowCount} columns` : 'Connect a join or table here' }}</template>
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

      <!-- Output fields, each with its Visible switch -->
      <ul
        v-if="outputListOpen"
        class="overflow-x-hidden overflow-y-auto border-t border-[#EEE] px-2 py-1.5"
        :style="outputListStyle"
      >
        <li
          v-for="row in outputFields"
          :key="row.key"
          class="flex h-5 min-w-0 items-center gap-1.5 px-1 text-xs"
          :title="`${row.dataEntityLabel} · ${row.name}`"
        >
          <span
            class="flex h-5 w-[26px] flex-shrink-0 items-center justify-center"
            @pointerdown.stop
            @click.stop
          >
            <ToggleSwitch
              size="sm"
              class="scale-[0.7]"
              :model-value="row.visible"
              :label="`Show ${row.label} in the output`"
              @update:model-value="emit('set-field-visibility', { keys: [row.key], visible: $event })"
            />
          </span>
          <span
            class="min-w-0 flex-1 truncate"
            :class="row.visible ? 'text-[#25262E]' : 'text-[#9A9A9A] line-through'"
          >
            {{ row.label }}<span v-if="repeatedOutputLabels.has(row.label)" class="text-[#9A9A9A]"> · {{ row.dataEntityLabel }}</span>
          </span>
          <span class="w-14 flex-shrink-0 text-right text-[10px] text-[#9A9A9A]">{{ row.type }}</span>
        </li>
      </ul>
    </template>

    <!-- "Updated" highlight: glow + tint over the card, and a chip naming the change -->
    <template v-if="highlighted">
      <span
        class="card-updated-glow pointer-events-none absolute -inset-px rounded-lg"
        :style="{ animationDuration: `${CARD_HIGHLIGHT_MS}ms` }"
        aria-hidden="true"
      />
      <span
        class="card-updated-chip pointer-events-none absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-[#3B1770] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
        :style="{ animationDuration: `${CARD_HIGHLIGHT_MS}ms` }"
        role="status"
      >
        <svg viewBox="0 0 24 24" class="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7L12 2Z" />
        </svg>
        Updated
      </span>
    </template>

    <!-- Resize width (right edge; ports still sit on top at their band) -->
    <span
      class="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize"
      title="Drag to resize width"
      @pointerdown.stop="emit('start-resize', { id: node.id, event: $event })"
    />

    <!-- Output: drag the bottom edge to show more or fewer fields, or the corner for both -->
    <template v-if="outputListOpen">
      <span
        class="absolute bottom-0 left-0 flex h-2 w-full cursor-ns-resize items-center justify-center"
        title="Drag to resize height"
        @pointerdown.stop="emit('start-resize', { id: node.id, event: $event, axis: 'y' })"
      >
        <span class="h-0.5 w-6 rounded-full bg-[#D0D0D0] transition-colors group-hover/card:bg-[#9A7BD0]" />
      </span>
      <span
        class="absolute bottom-0 right-0 flex h-3 w-3 cursor-nwse-resize items-end justify-end"
        title="Drag to resize"
        @pointerdown.stop="emit('start-resize', { id: node.id, event: $event, axis: 'both' })"
      >
        <svg viewBox="0 0 12 12" class="h-3 w-3 text-[#B8B8B8] transition-colors group-hover/card:text-[#9A7BD0]" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true">
          <path d="M10.5 5.5 5.5 10.5M10.5 8.5 8.5 10.5" />
        </svg>
      </span>
    </template>

    <!-- Remove (not for output) -->
    <button
      v-if="!isOutput"
      type="button"
      class="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-[#25262E] text-white text-xs leading-none hover:bg-[#3B1770] group-hover/card:flex"
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
      :style="{ top: `${outputPortDy}px` }"
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

<style scoped>
.join-save-shake {
  animation: join-save-shake 0.5s ease-in-out;
}

@keyframes join-save-shake {
  0%,
  100% {
    transform: translateX(0) scale(1);
  }
  20% {
    transform: translateX(-8px) scale(1.03);
  }
  40% {
    transform: translateX(8px) scale(1.03);
  }
  60% {
    transform: translateX(-5px) scale(1.02);
  }
  80% {
    transform: translateX(5px) scale(1);
  }
}

/* Two outward pulses with a brief tint, then the outline fades: one style for any card. */
.card-updated-glow {
  animation-name: card-updated-glow;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@keyframes card-updated-glow {
  0% {
    background-color: rgba(139, 92, 246, 0.16);
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0.9), 0 0 0 0 rgba(139, 92, 246, 0.55);
  }
  22% {
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0.9), 0 0 0 12px rgba(139, 92, 246, 0);
  }
  23% {
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0.9), 0 0 0 0 rgba(139, 92, 246, 0.45);
  }
  48% {
    background-color: rgba(139, 92, 246, 0.06);
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0.9), 0 0 0 12px rgba(139, 92, 246, 0);
  }
  75% {
    background-color: rgba(139, 92, 246, 0);
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0.7), 0 0 0 0 rgba(139, 92, 246, 0);
  }
  100% {
    background-color: rgba(139, 92, 246, 0);
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0), 0 0 0 0 rgba(139, 92, 246, 0);
  }
}

.card-updated-chip {
  animation-name: card-updated-chip;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@keyframes card-updated-chip {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.9);
  }
  10%,
  80% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(0) scale(1);
  }
}

/* No motion: hold a static outline and the chip for the same duration. */
@media (prefers-reduced-motion: reduce) {
  .card-updated-glow {
    animation: none;
    box-shadow: 0 0 0 2px rgba(59, 23, 112, 0.9);
  }
  .card-updated-chip {
    animation: none;
  }
}
</style>
