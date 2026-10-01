<script setup lang="ts">
import { computed, ref } from 'vue';
import DataSourceEditor from '~/components/datasource/DataSourceEditor.vue';
import type { CanvasNode } from '~/composables/useDataSourceCanvas';
import { editorExitLabel, type SourceViewMode } from '~/composables/useWorkspaceAssets';

interface PanelSource {
  id: string;
  name: string;
}

/**
 * The open workspace source on the real data source canvas.
 * Preview keeps the agent beside it; edit adds the source browser and inspectors.
 */
const props = withDefaults(
  defineProps<{
    mode?: SourceViewMode;
    updating?: boolean;
    sources?: PanelSource[];
    selectedSourceId?: string | null;
    /** The open source's nodes; read when the canvas mounts. */
    canvasNodes?: CanvasNode[];
    /** Remounts the canvas when it changes (another source, or discarded edits). */
    canvasKey?: string;
    hasUnsavedChanges?: boolean;
  }>(),
  {
    mode: 'preview',
    updating: false,
    sources: () => [],
    selectedSourceId: null,
    canvasNodes: () => [],
    canvasKey: '',
    hasUnsavedChanges: false,
  },
);

const emit = defineEmits<{
  close: [];
  edit: [];
  save: [];
  end: [];
  select: [id: string];
  'update:canvasNodes': [nodes: CanvasNode[]];
}>();

const editorRef = ref<{ saveSource: () => void } | null>(null);

const isPreview = computed(() => props.mode === 'preview');

const selectedSource = computed(
  () => props.sources.find((source) => source.id === props.selectedSourceId) ?? null,
);

const exitLabel = computed(() => editorExitLabel(props.hasUnsavedChanges));

function onEdit(): void {
  emit('edit');
}

/** Runs the canvas's join validation; the canvas emits `save` only when it passes. */
function onSave(): void {
  editorRef.value?.saveSource();
}

function onEndEditing(): void {
  emit('end');
}

function onSelectSource(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const id = target.value;
  if (!id || id === props.selectedSourceId) return;
  emit('select', id);
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col bg-white">
    <div
      v-if="updating"
      class="preview-update-overlay absolute inset-0 z-30 flex items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="relative z-10 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#3B1770] shadow-sm">
        Updating preview…
      </span>
    </div>
    <p
      v-if="!isPreview"
      class="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#E2E2E2] bg-[#F8F6FC] px-3 py-1.5 text-[11px] text-[#3B1770]"
    >
      <span>{{
        hasUnsavedChanges
          ? "You're editing this source. Save to keep changes, or discard to return to the agent."
          : "You're editing this source. Save to return to the agent."
      }}</span>
      <button
        type="button"
        class="flex-shrink-0 rounded border border-[#E2E2E2] bg-white px-2 py-0.5 text-[11px] font-medium text-[#25262E] transition-colors hover:bg-[#F8F6FC]"
        @click="onEndEditing"
      >
        {{ exitLabel }}
      </button>
    </p>

    <!-- Toolbar -->
    <div class="flex h-12 flex-shrink-0 items-center justify-between gap-4 border-b border-[#E2E2E2] bg-white px-4">
      <div class="flex min-w-0 items-center gap-2">
        <template v-if="isPreview">
          <span class="flex-shrink-0 text-sm font-medium text-[#25262E]">Preview</span>
          <label class="sr-only" for="preview-source">Data source</label>
          <select
            id="preview-source"
            class="h-8 min-w-[10rem] max-w-[18rem] rounded-md border border-[#E2E2E2] bg-white px-2 text-[12px] text-[#25262E] outline-none focus:border-[#3B1770]"
            :value="selectedSourceId ?? ''"
            :disabled="sources.length < 2"
            @change="onSelectSource"
          >
            <option v-for="source in sources" :key="source.id" :value="source.id">
              {{ source.name }}
            </option>
          </select>
        </template>
        <template v-else>
          <span class="flex-shrink-0 text-sm font-medium text-[#25262E]">Editing</span>
          <span class="min-w-0 truncate text-sm text-[#6B6B6B]">{{ selectedSource?.name }}</span>
        </template>
      </div>

      <div class="flex flex-shrink-0 items-center gap-3">
        <template v-if="isPreview">
          <button
            type="button"
            class="rounded bg-[#3B1770] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#4B1E8C]"
            @click="onEdit"
          >
            Edit source
          </button>
          <span class="h-5 w-px flex-shrink-0 bg-[#E2E2E2]"></span>
          <button
            type="button"
            class="text-[#6B6B6B] transition-colors hover:text-[#3B1770]"
            title="Close preview"
            aria-label="Close preview"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </template>
        <button
          v-else
          type="button"
          class="rounded bg-[#3B1770] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#4B1E8C]"
          @click="onSave"
        >
          Save Source
        </button>
      </div>
    </div>

    <!-- Settings, demo presets and the canvas's own Save belong to the standalone page -->
    <DataSourceEditor
      :key="canvasKey"
      ref="editorRef"
      :storage-key="null"
      :initial-nodes="canvasNodes"
      :show-settings="false"
      :show-demo="false"
      :show-save="false"
      :show-side-panel="!isPreview"
      @update:canvas-nodes="emit('update:canvasNodes', $event)"
      @save="emit('save')"
    />
  </div>
</template>

<style scoped>
.preview-update-overlay {
  background: rgba(255, 255, 255, 0.45);
}
.preview-update-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 25%,
    rgba(255, 255, 255, 0.8) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: preview-shimmer 1.4s ease-in-out infinite;
}
@keyframes preview-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
