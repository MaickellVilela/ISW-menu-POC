<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NODE_WIDTH,
  PORT_DY,
  JOIN_RIGHT_PORT_DY,
  JOIN_TYPE_LABELS,
  type CanvasNode,
  type JoinType,
} from '~/composables/useDataSourceCanvas';
import JoinVennIcon from './JoinVennIcon.vue';

const props = withDefaults(
  defineProps<{
    node: CanvasNode;
    isConnectTarget?: boolean;
    leftLabel?: string;
    rightLabel?: string;
    leftFields?: string[];
    rightFields?: string[];
    inflowCount?: number;
  }>(),
  { leftLabel: '', rightLabel: '', leftFields: () => [], rightFields: () => [], inflowCount: 0 },
);

const emit = defineEmits<{
  (e: 'start-move', payload: { id: string; event: PointerEvent }): void;
  (e: 'start-connect', payload: { id: string; event: PointerEvent }): void;
  (e: 'remove', id: string): void;
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

const baseStyle = computed(() => ({
  left: `${props.node.x}px`,
  top: `${props.node.y}px`,
  width: `${NODE_WIDTH}px`,
}));

function onSelectType(joinType: JoinType): void {
  emit('set-join-type', { id: props.node.id, joinType });
  typeMenuOpen.value = false;
}
</script>

<template>
  <div
    :data-node-id="node.id"
    class="group absolute select-none rounded-lg border bg-white shadow-sm"
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
  >
    <!-- ======================= TABLE ======================= -->
    <template v-if="node.type === 'table'">
      <header
        class="flex h-9 items-center gap-2 rounded-t-lg border-b border-[#EEE] bg-[#F7F9FC] px-2.5 cursor-grab active:cursor-grabbing"
        @pointerdown="emit('start-move', { id: node.id, event: $event })"
      >
        <span class="flex h-5 w-5 items-center justify-center text-[#3B6BB5]">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18M3 14h18M9 4v16" />
          </svg>
        </span>
        <span class="flex-1 truncate text-sm font-semibold text-[#25262E]">{{ node.label }}</span>
      </header>
      <ul class="px-2.5 py-1.5">
        <li
          v-for="field in node.fields"
          :key="field"
          class="flex items-center gap-1.5 py-0.5 text-xs text-[#5A5A5A]"
        >
          <span class="h-1 w-1 rounded-full bg-[#C4C4C4]" />
          {{ field }}
        </li>
      </ul>
    </template>

    <!-- ======================= JOIN ======================= -->
    <template v-else-if="isJoin">
      <header
        class="relative flex h-9 items-center gap-1.5 rounded-t-lg border-b border-[#EEE] bg-[#F5F1FC] px-2 cursor-grab active:cursor-grabbing"
        @pointerdown="emit('start-move', { id: node.id, event: $event })"
      >
        <button
          type="button"
          class="flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-white"
          @pointerdown.stop
          @click.stop="typeMenuOpen = !typeMenuOpen"
        >
          <JoinVennIcon :type="node.joinType ?? 'inner'" />
          <span class="text-sm font-semibold text-[#3B1770]">{{ JOIN_TYPE_LABELS[node.joinType ?? 'inner'] }}</span>
          <svg viewBox="0 0 24 24" class="h-3 w-3 text-[#9A7BD0]" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <span class="flex-1" />
        <button
          type="button"
          title="Swap Left / Right"
          class="flex h-6 w-6 items-center justify-center rounded text-[#9A7BD0] hover:bg-white hover:text-[#3B1770]"
          @pointerdown.stop
          @click.stop="emit('swap-inputs', node.id)"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h11l-3-3m3 3l-3 3M17 17H6l3-3m-3 3l3 3" /></svg>
        </button>

        <!-- Join type menu -->
        <template v-if="typeMenuOpen">
          <div class="fixed inset-0 z-30" @pointerdown.stop @click.stop="typeMenuOpen = false" />
          <ul class="absolute left-1 top-9 z-40 w-36 overflow-hidden rounded-md border border-[#E2E2E2] bg-white py-1 shadow-lg" @pointerdown.stop>
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

      <!-- Left / Right inputs -->
      <div class="px-3 pt-1.5 text-xs">
        <div class="flex items-center gap-1.5 py-0.5">
          <span class="font-semibold uppercase tracking-wide text-[#3B6BB5]">Left</span>
          <span class="truncate text-[#5A5A5A]">{{ leftLabel || 'not connected' }}</span>
        </div>
        <div class="flex items-center gap-1.5 py-0.5">
          <span class="font-semibold uppercase tracking-wide text-[#8B5CF6]">Right</span>
          <span class="truncate text-[#5A5A5A]">{{ rightLabel || 'not connected' }}</span>
        </div>
      </div>

      <!-- Conditions -->
      <div class="border-t border-[#EEE] px-2.5 py-2">
        <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Match on</p>
        <div
          v-for="condition in node.conditions"
          :key="condition.id"
          class="mb-1 flex items-center gap-1"
        >
          <select
            class="min-w-0 flex-1 rounded border border-[#E2E2E2] bg-white px-1 py-0.5 text-[11px] text-[#3B6BB5]"
            :value="condition.leftField"
            @pointerdown.stop
            @click.stop
            @change="emit('update-condition', { id: node.id, conditionId: condition.id, side: 'leftField', value: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">Left field…</option>
            <option v-for="field in leftFields" :key="field" :value="field">{{ field }}</option>
          </select>
          <span class="text-[#9A9A9A]">=</span>
          <select
            class="min-w-0 flex-1 rounded border border-[#E2E2E2] bg-white px-1 py-0.5 text-[11px] text-[#8B5CF6]"
            :value="condition.rightField"
            @pointerdown.stop
            @click.stop
            @change="emit('update-condition', { id: node.id, conditionId: condition.id, side: 'rightField', value: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">Right field…</option>
            <option v-for="field in rightFields" :key="field" :value="field">{{ field }}</option>
          </select>
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
        <button
          type="button"
          class="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-[#3B1770] hover:underline"
          @pointerdown.stop
          @click.stop="emit('add-condition', node.id)"
        >
          <span class="text-sm leading-none">+</span> Add condition
        </button>
      </div>
    </template>

    <!-- ======================= OUTPUT ======================= -->
    <template v-else>
      <header
        class="flex h-9 items-center gap-2 rounded-t-lg bg-[#25262E] px-2.5 text-white cursor-grab active:cursor-grabbing"
        @pointerdown="emit('start-move', { id: node.id, event: $event })"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
        </svg>
        <span class="flex-1 text-sm font-semibold">Output</span>
      </header>
      <div class="px-3 py-2 text-xs text-[#6B6B6B]">
        <p>Final dataset</p>
        <p class="mt-0.5 text-[#9A9A9A]">
          {{ inflowCount > 0 ? `${inflowCount} columns` : 'Connect a join or table here' }}
        </p>
      </div>
    </template>

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
      :style="{ top: `${PORT_DY}px` }"
    />
    <span
      v-if="isJoin"
      class="absolute -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-[#8B5CF6]"
      :style="{ top: `${JOIN_RIGHT_PORT_DY}px` }"
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
      :style="{ top: `${PORT_DY}px` }"
      @pointerdown.stop="emit('start-connect', { id: node.id, event: $event })"
      @click.stop
    />
  </div>
</template>
