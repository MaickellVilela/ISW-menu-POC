<script setup lang="ts">
import { computed, ref } from 'vue';
import DataSourceEditor from '~/components/datasource/DataSourceEditor.vue';
import DataSourceSettingsPanel from '~/components/datasource/DataSourceSettingsPanel.vue';
import CertifiedQuestionsList from '~/components/workspace/CertifiedQuestionsList.vue';
import type { CanvasHighlight, CanvasNode } from '~/composables/useDataSourceCanvas';
import type { ConfigurationSection } from '~/composables/canvasFilterShortcuts';
import { useCertifiedQuestions } from '~/composables/useCertifiedQuestions';
import { editorExitLabel, type SourceViewMode } from '~/composables/useWorkspaceAssets';

interface PanelSource {
  id: string;
  name: string;
}

/**
 * The open workspace source on the real data source canvas.
 * Preview keeps the agent beside it; edit adds the source browser and inspectors;
 * configuration replaces the canvas and adds the Certified questions section.
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
    /** Card the agent just "updated", highlighted on the canvas. */
    highlight?: CanvasHighlight | null;
    /** Configuration replaces the canvas, from preview or edit. */
    configuring?: boolean;
    configureSection?: ConfigurationSection;
    /** Certified question to scroll to and ring in the list. */
    certifiedHighlightId?: string | null;
  }>(),
  {
    highlight: null,
    configuring: false,
    configureSection: 'time-bar',
    certifiedHighlightId: null,
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
  configure: [];
  endConfigure: [];
  'update:configureSection': [section: ConfigurationSection];
}>();

const { questionsFor } = useCertifiedQuestions();

const editorRef = ref<{ saveSource: () => void } | null>(null);

const isPreview = computed(() => props.mode === 'preview');

const selectedSource = computed(
  () => props.sources.find((source) => source.id === props.selectedSourceId) ?? null,
);

const exitLabel = computed(() => editorExitLabel(props.hasUnsavedChanges));

const certifiedCount = computed(() => questionsFor(props.selectedSourceId).length);

/** Edit and configure share one banner; configuring returns to wherever it started. */
const bannerText = computed(() => {
  if (props.configuring) return "You're configuring this source. Changes apply right away.";
  return props.hasUnsavedChanges
    ? "You're editing this source. Save to keep changes, or discard to return to the agent."
    : "You're editing this source. Save to return to the agent.";
});

const bannerExitLabel = computed(() => {
  if (!props.configuring) return exitLabel.value;
  return isPreview.value ? 'Back to agent' : 'Back to editing';
});

function onBannerExit(): void {
  if (props.configuring) emit('endConfigure');
  else onEndEditing();
}

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
      v-if="configuring || !isPreview"
      class="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#E2E2E2] bg-[#F8F6FC] px-3 py-1.5 text-[11px] text-[#3B1770]"
    >
      <span>{{ bannerText }}</span>
      <button
        type="button"
        class="flex-shrink-0 rounded border border-[#E2E2E2] bg-white px-2 py-0.5 text-[11px] font-medium text-[#25262E] transition-colors hover:bg-[#F8F6FC]"
        @click="onBannerExit"
      >
        {{ bannerExitLabel }}
      </button>
    </p>

    <!-- Toolbar -->
    <div class="flex h-12 flex-shrink-0 items-center justify-between gap-4 border-b border-[#E2E2E2] bg-white px-4">
      <div class="flex min-w-0 items-center gap-2">
        <template v-if="configuring">
          <span class="flex-shrink-0 text-sm font-medium text-[#25262E]">Configuration</span>
          <span class="min-w-0 truncate text-sm text-[#6B6B6B]">{{ selectedSource?.name }}</span>
        </template>
        <template v-else-if="isPreview">
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

      <div v-if="!configuring" class="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded border border-[#E2E2E2] bg-white px-3 py-1.5 text-[12px] font-medium text-[#25262E] transition-colors hover:bg-[#F8F6FC]"
          title="Configure this data source"
          @click="emit('configure')"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke-linecap="round" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          Configure
        </button>
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

    <!-- Data settings are shared across sources in this prototype; the banner ends configuring -->
    <DataSourceSettingsPanel
      v-if="configuring"
      class="min-h-0 flex-1"
      :source-name="selectedSource?.name"
      :active-section="configureSection"
      :show-back="false"
      agent-sections
      :certified-count="certifiedCount"
      @go-to-canvas="emit('endConfigure')"
      @update:active-section="emit('update:configureSection', $event)"
    >
      <template #certified-questions>
        <CertifiedQuestionsList
          v-if="selectedSource"
          :source-id="selectedSource.id"
          :source-name="selectedSource.name"
          :highlight-id="certifiedHighlightId"
        />
      </template>
    </DataSourceSettingsPanel>

    <!-- Settings, demo presets and the canvas's own Save belong to the standalone page.
         The canvas remounts from the stored nodes after configuring (it fits itself on mount). -->
    <DataSourceEditor
      v-else
      :key="canvasKey"
      ref="editorRef"
      :storage-key="null"
      :initial-nodes="canvasNodes"
      :show-settings="false"
      :show-demo="false"
      :show-save="false"
      :show-side-panel="!isPreview"
      :highlight="highlight"
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
