<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  useDataSourceCanvas,
  outputAnchor,
  inputAnchor,
  collectSourceFields,
  usedFieldValues,
  findSuggestedOutputSource,
  nodeWidth,
  SOURCE_DRAG_MIME,
  NODE_WIDTH,
  PORT_DY,
  type CanvasNode as CanvasNodeModel,
  type SourceItem,
  type Point,
} from '~/composables/useDataSourceCanvas';
import CanvasNode from './CanvasNode.vue';
import ConnectionLines from './ConnectionLines.vue';
import CanvasHelp from './CanvasHelp.vue';
import { DEMO_PRESETS, type DemoPreset } from '~/composables/demoPresets';

const SURFACE_WIDTH = 3600;
const SURFACE_HEIGHT = 2400;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;

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
  toggleCollapse,
  setAllCollapsed,
  setNodeName,
  setNodeWidth,
  removeNode,
  clear,
  loadPreset,
  tidyLayout,
  commit,
  undo,
  redo,
  canUndo,
  canRedo,
} = useDataSourceCanvas();

const surface = ref<HTMLElement | null>(null);
const isDragOver = ref(false);
const zoom = ref(1);
const showDemoMenu = ref(false);
const showHelp = ref(false);
// Reflects the real cards: compact only when every card is collapsed, else
// expanded. Since cards are created expanded, this defaults to 'expanded'.
const viewMode = computed<'expanded' | 'compact'>(() => {
  const collapsible = nodes.value.filter((node) => node.type !== 'output');
  return collapsible.length > 0 && collapsible.every((node) => node.collapsed) ? 'compact' : 'expanded';
});

function setViewMode(mode: 'expanded' | 'compact'): void {
  setAllCollapsed(mode === 'compact');
}

function toggleDemoMenu(): void {
  showDemoMenu.value = !showDemoMenu.value;
}

function applyPreset(preset: DemoPreset): void {
  loadPreset(preset.build());
  resetZoom();
  showDemoMenu.value = false;
}

type Interaction =
  | { mode: 'move'; id: string; offsetX: number; offsetY: number }
  | { mode: 'connect'; fromId: string }
  | { mode: 'resize'; id: string; startX: number; startWidth: number };

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
const usedValues = computed(() => usedFieldValues(nodes.value));

/* -------------------------- output suggestion ---------------------------- */

// While the Output is unconnected, propose wiring the terminal join into it
// with a dashed connector and a mid-line "Set as output" button.
const suggestedOutputId = computed(() => findSuggestedOutputSource(nodes.value));

const suggestionLine = computed(() => {
  const source = suggestedOutputId.value ? findNode(suggestedOutputId.value) : undefined;
  const output = nodes.value.find((node) => node.type === 'output');
  if (!source || !output) return null;
  return { from: outputAnchor(source), to: inputAnchor(output, 0) };
});

const suggestionMidpoint = computed(() => {
  const line = suggestionLine.value;
  if (!line) return null;
  return { x: (line.from.x + line.to.x) / 2, y: (line.from.y + line.to.y) / 2 };
});

function acceptSuggestion(): void {
  if (suggestedOutputId.value) connectToOutput(suggestedOutputId.value);
}

/* ---------------------------- derived props ------------------------------ */

function labelFor(id: string | undefined): string {
  if (!id) return '';
  const node = findNode(id);
  if (!node) return '';
  return node.type === 'join' ? 'Join result' : node.label;
}

function fieldsFor(id: string | undefined) {
  return collectSourceFields(nodes.value, id);
}

function activeFieldsFor(node: CanvasNodeModel): string[] {
  if (node.type !== 'table') return [];
  return (node.fields ?? [])
    .filter((field) => usedValues.value.has(`${node.label}.${field.name}`))
    .map((field) => field.name);
}

/* ------------------------------- zoom ------------------------------------ */

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function setZoom(value: number): void {
  zoom.value = Math.round(clampZoom(value) * 100) / 100;
}

function zoomIn(): void {
  setZoom(zoom.value + 0.1);
}

function zoomOut(): void {
  setZoom(zoom.value - 0.1);
}

function resetZoom(): void {
  setZoom(1);
}

function onWheel(event: WheelEvent): void {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  setZoom(zoom.value - event.deltaY * 0.002);
}

/* ------------------------------ coordinates ------------------------------ */

function toSurfaceCoords(event: { clientX: number; clientY: number }): Point {
  const rect = surface.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return { x: (event.clientX - rect.left) / zoom.value, y: (event.clientY - rect.top) / zoom.value };
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

function onStartResize({ id, event }: { id: string; event: PointerEvent }): void {
  const node = findNode(id);
  if (!node) return;
  const { x } = toSurfaceCoords(event);
  interaction.value = { mode: 'resize', id, startX: x, startWidth: nodeWidth(node) };
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
  } else if (interaction.value.mode === 'resize') {
    setNodeWidth(interaction.value.id, interaction.value.startWidth + (pointer.value.x - interaction.value.startX));
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
  } else if (current?.mode === 'move' || current?.mode === 'resize') {
    // Continuous gestures mutate live during the drag; record one undo step now.
    commit();
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

function onPreview(): void {
  // Placeholder: preview action intentionally not implemented yet.
}

/* ------------------------------ shortcuts -------------------------------- */

/** True while the user is typing in a form field, so shortcuts stay dormant. */
function isEditingText(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && showHelp.value) {
    showHelp.value = false;
    return;
  }
  if (!(event.metaKey || event.ctrlKey) || isEditingText(event.target)) return;
  if (event.key.toLowerCase() !== 'z') return;
  event.preventDefault();
  if (event.shiftKey) redo();
  else undo();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  detachWindowListeners();
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <!-- Toolbar -->
    <div class="z-20 flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] bg-white px-4 py-2">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-[#25262E]">Data Source Creation</span>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center rounded-md border border-[#E2E2E2] text-xs">
          <button
            type="button"
            class="rounded-l-md px-2.5 py-1 font-medium transition-colors"
            :class="viewMode === 'expanded' ? 'bg-[#F1ECFA] text-[#3B1770]' : 'text-[#6B6B6B] hover:text-[#3B1770]'"
            title="Show full card details"
            @click="setViewMode('expanded')"
          >
            Expanded
          </button>
          <button
            type="button"
            class="rounded-r-md border-l border-[#E2E2E2] px-2.5 py-1 font-medium transition-colors"
            :class="viewMode === 'compact' ? 'bg-[#F1ECFA] text-[#3B1770]' : 'text-[#6B6B6B] hover:text-[#3B1770]'"
            title="Collapse cards to headers"
            @click="setViewMode('compact')"
          >
            Compact
          </button>
        </div>
        <div class="flex items-center rounded-md border border-[#E2E2E2]">
          <button type="button" class="px-2 py-1 text-sm text-[#6B6B6B] hover:text-[#3B1770]" title="Zoom out" @click="zoomOut">−</button>
          <button type="button" class="w-12 border-x border-[#E2E2E2] py-1 text-xs text-[#6B6B6B] hover:text-[#3B1770]" title="Reset zoom" @click="resetZoom">{{ Math.round(zoom * 100) }}%</button>
          <button type="button" class="px-2 py-1 text-sm text-[#6B6B6B] hover:text-[#3B1770]" title="Zoom in" @click="zoomIn">+</button>
        </div>
        <div class="flex items-center rounded-md border border-[#E2E2E2]">
          <button
            type="button"
            class="px-2 py-1 text-[#6B6B6B] hover:text-[#3B1770] disabled:opacity-40 disabled:hover:text-[#6B6B6B]"
            :disabled="!canUndo"
            title="Undo (⌘Z)"
            @click="undo"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
            </svg>
          </button>
          <button
            type="button"
            class="border-l border-[#E2E2E2] px-2 py-1 text-[#6B6B6B] hover:text-[#3B1770] disabled:opacity-40 disabled:hover:text-[#6B6B6B]"
            :disabled="!canRedo"
            title="Redo (⌘⇧Z)"
            @click="redo"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 14 5-5-5-5" />
              <path d="M20 9H9a5 5 0 0 0 0 10h1" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md border border-[#E2E2E2] px-3 py-1 text-xs font-medium text-[#6B6B6B] hover:border-[#3B1770] hover:text-[#3B1770] disabled:opacity-40"
          :disabled="!hasContent"
          title="Auto-align and reorganize the cards"
          @click="tidyLayout"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h10M4 18h7" />
          </svg>
          Tidy up
        </button>
        <button
          type="button"
          class="rounded-md border border-[#E2E2E2] px-3 py-1 text-xs font-medium text-[#6B6B6B] hover:border-[#3B1770] hover:text-[#3B1770] disabled:opacity-40"
          :disabled="!hasContent"
          @click="clear"
        >
          Clear canvas
        </button>
      </div>
    </div>

    <!-- Scroll viewport -->
    <div class="relative flex-1 overflow-auto bg-[#FAFAFA]" @wheel="onWheel">
      <!-- Sizer drives the scrollable area to match the zoomed surface -->
      <div :style="{ width: `${SURFACE_WIDTH * zoom}px`, height: `${SURFACE_HEIGHT * zoom}px` }" />

      <!-- Positioning surface (scaled) -->
      <div
        ref="surface"
        class="absolute left-0 top-0 origin-top-left"
        :class="{ 'ring-2 ring-inset ring-[#3B1770]/40': isDragOver }"
        :style="{
          width: `${SURFACE_WIDTH}px`,
          height: `${SURFACE_HEIGHT}px`,
          transform: `scale(${zoom})`,
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
          :suggestion="interaction ? null : suggestionLine"
          :width="SURFACE_WIDTH"
          :height="SURFACE_HEIGHT"
        />

        <!-- Suggest wiring the terminal join into the Output -->
        <button
          v-if="suggestionMidpoint && !interaction"
          type="button"
          class="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-[#C9B8EC] bg-white px-2.5 py-1 text-xs font-medium text-[#3B1770] shadow-sm hover:bg-[#F5F1FC]"
          :style="{ left: `${suggestionMidpoint.x}px`, top: `${suggestionMidpoint.y}px` }"
          title="Connect this join to the Output"
          @pointerdown.stop
          @click.stop="acceptSuggestion"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m0 0-5-5m5 5-5 5" /></svg>
          Set as output
        </button>

        <CanvasNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :is-connect-target="connectTargetId === node.id"
          :left-label="labelFor(node.inputs?.[0])"
          :right-label="labelFor(node.inputs?.[1])"
          :left-fields="fieldsFor(node.inputs?.[0])"
          :right-fields="fieldsFor(node.inputs?.[1])"
          :active-fields="activeFieldsFor(node)"
          :inflow-count="node.type === 'output' ? fieldsFor(node.inputs?.[0]).length : 0"
          @start-move="onStartMove"
          @start-connect="onStartConnect"
          @start-resize="onStartResize"
          @remove="removeNode"
          @rename="setNodeName($event.id, $event.name)"
          @toggle-collapse="toggleCollapse"
          @preview="onPreview"
          @set-join-type="setJoinType($event.id, $event.joinType)"
          @swap-inputs="swapInputs"
          @add-condition="addCondition"
          @update-condition="updateCondition($event.id, $event.conditionId, $event.side, $event.value)"
          @remove-condition="removeCondition($event.id, $event.conditionId)"
        />
      </div>

      <!-- Visual empty state -->
      <div
        v-if="!hasContent"
        class="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[26rem] max-w-[80%] -translate-x-1/2 -translate-y-1/2"
      >
        <div class="rounded-xl border border-dashed border-[#C9B8EC] bg-white/80 p-6 text-center backdrop-blur">
          <CanvasHelp />
        </div>
      </div>
    </div>

    <!-- Floating demo presets (pinned to the canvas, above the scroll viewport) -->
    <div class="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      <div
        v-if="showDemoMenu"
        class="w-64 overflow-hidden rounded-lg border border-[#E2E2E2] bg-white shadow-xl"
      >
        <div class="border-b border-[#F0F0F0] px-3 py-2">
          <p class="text-xs font-semibold text-[#25262E]">Demo scenarios</p>
          <p class="mt-0.5 text-[11px] text-[#9A9A9A]">Loads a ready-made pipeline</p>
        </div>
        <button
          v-for="preset in DEMO_PRESETS"
          :key="preset.id"
          type="button"
          class="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-[#F5F1FC]"
          @click="applyPreset(preset)"
        >
          <span class="text-sm font-medium text-[#25262E]">{{ preset.name }}</span>
          <span class="text-xs text-[#6B6B6B]">{{ preset.description }}</span>
        </button>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 rounded-full bg-[#3B1770] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[#4B1E8C]"
        :aria-expanded="showDemoMenu"
        @click="toggleDemoMenu"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 5v14l11-7z" />
        </svg>
        Demo
      </button>
    </div>

    <!-- Persistent help (bottom-left) -->
    <button
      type="button"
      class="absolute bottom-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E2E2] bg-white text-[#6B6B6B] shadow-lg hover:border-[#3B1770] hover:text-[#3B1770]"
      title="How to build a data source"
      aria-label="Help"
      @click="showHelp = true"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7" />
        <path d="M12 17h.01" />
      </svg>
    </button>

    <!-- Help modal -->
    <div
      v-if="showHelp"
      class="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
      @click.self="showHelp = false"
    >
      <div class="relative w-[28rem] max-w-full rounded-xl border border-[#E2E2E2] bg-white p-6 text-center shadow-xl">
        <button
          type="button"
          class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-[#9A9A9A] hover:bg-[#F0F0F0] hover:text-[#25262E]"
          aria-label="Close help"
          @click="showHelp = false"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <CanvasHelp />
      </div>
    </div>
  </div>
</template>
