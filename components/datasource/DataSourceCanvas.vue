<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import {
  useDataSourceCanvas,
  outputAnchor,
  collectSourceFields,
  SOURCE_DRAG_MIME,
  NODE_WIDTH,
  PORT_DY,
  type SourceItem,
  type Point,
} from '~/composables/useDataSourceCanvas';
import CanvasNode from './CanvasNode.vue';
import ConnectionLines from './ConnectionLines.vue';

const SURFACE_WIDTH = 2400;
const SURFACE_HEIGHT = 1600;

const {
  nodes,
  connections,
  findNode,
  addTable,
  moveNode,
  joinNodes,
  connectToOutput,
  setJoinType,
  swapInputs,
  addCondition,
  updateCondition,
  removeCondition,
  removeNode,
  clear,
} = useDataSourceCanvas();

const surface = ref<HTMLElement | null>(null);
const isDragOver = ref(false);

type Interaction =
  | { mode: 'move'; id: string; offsetX: number; offsetY: number }
  | { mode: 'connect'; fromId: string };

const interaction = ref<Interaction | null>(null);
const pointer = ref<Point>({ x: 0, y: 0 });
const connectTargetId = ref<string | null>(null);

const tempLine = computed(() => {
  if (interaction.value?.mode !== 'connect') return null;
  const source = findNode(interaction.value.fromId);
  if (!source) return null;
  return { from: outputAnchor(source), to: pointer.value };
});

const hasContent = computed(() => nodes.value.some((node) => node.type !== 'output'));

/* ---------------------------- derived props ------------------------------ */

function labelFor(id: string | undefined): string {
  if (!id) return '';
  const node = findNode(id);
  if (!node) return '';
  return node.type === 'join' ? 'Join result' : node.label;
}

function fieldsFor(id: string | undefined): string[] {
  return collectSourceFields(nodes.value, id);
}

/* ------------------------------ coordinates ------------------------------ */

function toSurfaceCoords(event: { clientX: number; clientY: number }): Point {
  const rect = surface.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function nodeIdAtPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  const host = el?.closest('[data-node-id]') as HTMLElement | null;
  return host?.dataset.nodeId ?? null;
}

/* --------------------------- drop new tables ----------------------------- */

function onDragOver(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  isDragOver.value = true;
}

function onDragLeave(): void {
  isDragOver.value = false;
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  isDragOver.value = false;

  const raw = event.dataTransfer?.getData(SOURCE_DRAG_MIME);
  if (!raw) return;

  let item: SourceItem;
  try {
    item = JSON.parse(raw) as SourceItem;
  } catch {
    return;
  }

  const { x, y } = toSurfaceCoords(event);
  addTable(item, x - NODE_WIDTH / 2, y - PORT_DY);
}

/* --------------------- move nodes & connect handles ---------------------- */

function onStartMove({ id, event }: { id: string; event: PointerEvent }): void {
  const node = findNode(id);
  if (!node) return;
  const { x, y } = toSurfaceCoords(event);
  interaction.value = { mode: 'move', id, offsetX: x - node.x, offsetY: y - node.y };
  attachWindowListeners();
}

function onStartConnect({ id, event }: { id: string; event: PointerEvent }): void {
  interaction.value = { mode: 'connect', fromId: id };
  pointer.value = toSurfaceCoords(event);
  attachWindowListeners();
}

function onPointerMove(event: PointerEvent): void {
  if (!interaction.value) return;
  pointer.value = toSurfaceCoords(event);

  if (interaction.value.mode === 'move') {
    moveNode(
      interaction.value.id,
      pointer.value.x - interaction.value.offsetX,
      pointer.value.y - interaction.value.offsetY,
    );
  } else if (interaction.value.mode === 'connect') {
    const targetId = nodeIdAtPoint(event.clientX, event.clientY);
    connectTargetId.value = targetId && targetId !== interaction.value.fromId ? targetId : null;
  }
}

function onPointerUp(event: PointerEvent): void {
  const current = interaction.value;
  if (current?.mode === 'connect') {
    const targetId = nodeIdAtPoint(event.clientX, event.clientY);
    const target = targetId ? findNode(targetId) : undefined;
    if (target && targetId && targetId !== current.fromId) {
      if (target.type === 'output') connectToOutput(current.fromId);
      else joinNodes(current.fromId, targetId);
    }
  }
  resetInteraction();
}

function resetInteraction(): void {
  interaction.value = null;
  connectTargetId.value = null;
  detachWindowListeners();
}

function attachWindowListeners(): void {
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function detachWindowListeners(): void {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

onBeforeUnmount(detachWindowListeners);
</script>

<template>
  <div class="relative h-full w-full overflow-auto bg-[#FAFAFA]">
    <!-- Toolbar -->
    <div class="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E2E2] bg-white/90 px-4 py-2 backdrop-blur">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-[#25262E]">Join Builder</span>
        <span class="flex items-center gap-3 text-[11px] text-[#6B6B6B]">
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#3B6BB5]" /> Left</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#8B5CF6]" /> Right</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#25262E]" /> Output</span>
        </span>
      </div>
      <button
        type="button"
        class="rounded-md border border-[#E2E2E2] px-3 py-1 text-xs font-medium text-[#6B6B6B] hover:border-[#3B1770] hover:text-[#3B1770] disabled:opacity-40"
        :disabled="!hasContent"
        @click="clear"
      >
        Clear canvas
      </button>
    </div>

    <!-- Positioning surface -->
    <div
      ref="surface"
      class="relative"
      :class="{ 'ring-2 ring-inset ring-[#3B1770]/40': isDragOver }"
      :style="{
        width: `${SURFACE_WIDTH}px`,
        height: `${SURFACE_HEIGHT}px`,
        backgroundImage: 'radial-gradient(#D8D8D8 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <ConnectionLines
        :connections="connections"
        :temp-line="tempLine"
        :width="SURFACE_WIDTH"
        :height="SURFACE_HEIGHT"
      />

      <CanvasNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :is-connect-target="connectTargetId === node.id"
        :left-label="labelFor(node.inputs?.[0])"
        :right-label="labelFor(node.inputs?.[1])"
        :left-fields="fieldsFor(node.inputs?.[0])"
        :right-fields="fieldsFor(node.inputs?.[1])"
        :inflow-count="node.type === 'output' ? fieldsFor(node.inputs?.[0]).length : 0"
        @start-move="onStartMove"
        @start-connect="onStartConnect"
        @remove="removeNode"
        @set-join-type="setJoinType($event.id, $event.joinType)"
        @swap-inputs="swapInputs"
        @add-condition="addCondition"
        @update-condition="updateCondition($event.id, $event.conditionId, $event.side, $event.value)"
        @remove-condition="removeCondition($event.id, $event.conditionId)"
      />
    </div>

    <!-- Empty state, anchored to the visible viewport -->
    <div
      v-if="!hasContent"
      class="pointer-events-none absolute left-1/3 top-1/3 z-10 -translate-x-1/2 -translate-y-1/2 text-center"
    >
      <p class="text-sm font-medium text-[#6B6B6B]">Drag a data source here to begin</p>
      <p class="mt-1 text-xs text-[#9A9A9A]">
        Drag from an element's right handle onto another to create a join, or onto Output for the final result.
      </p>
    </div>
  </div>
</template>
