<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import SimbaChatPanel from '~/components/workspace/SimbaChatPanel.vue';
import LegacyBuilderPanel from '~/components/workspace/LegacyBuilderPanel.vue';
import AssetListPanel from '~/components/workspace/AssetListPanel.vue';
import { useWorkspaceAssets } from '~/composables/useWorkspaceAssets';
import type { DataSourceSetup } from '~/composables/useDataSourceFlow';

const route = useRoute();

const FALLBACK_WORKSPACE_NAME = 'Workspace';

/** Demo catalog — keep in sync with the list page for this POC. */
const WORKSPACE_NAMES: Record<string, string> = {
  new: 'Untitled workspace',
  mkt: 'Marketing analytics',
  hc: 'Healthcare pipeline',
  sales: 'Sales forecasting',
};

const workspaceId = computed(() => String(route.params.id));

function nameForWorkspaceId(id: string): string {
  return WORKSPACE_NAMES[id] ?? FALLBACK_WORKSPACE_NAME;
}

/** Keeps the current name when the draft is blank or whitespace. */
function trimmedOrFallback(draft: string, fallback: string): string {
  const name = draft.trim();
  return name || fallback;
}

const workspaceName = ref(nameForWorkspaceId(workspaceId.value));
const isEditingName = ref(false);
const nameDraft = ref('');
const nameInputRef = ref<HTMLInputElement | null>(null);

async function startNameEdit(): Promise<void> {
  nameDraft.value = workspaceName.value;
  isEditingName.value = true;
  await nextTick();
  nameInputRef.value?.focus();
  nameInputRef.value?.select();
}

function commitNameEdit(): void {
  if (!isEditingName.value) return;
  workspaceName.value = trimmedOrFallback(nameDraft.value, workspaceName.value);
  isEditingName.value = false;
}

function cancelNameEdit(): void {
  isEditingName.value = false;
  nameDraft.value = '';
}

const {
  assets,
  attachments,
  openAssetId,
  openAsset,
  selectedIds,
  canPublish,
  isEditorOpen,
  isEditingSource,
  sourceViewMode,
  openEditor,
  closeEditor,
  startEdit,
  saveEdits,
  addFromSetup,
  importFromCatalog,
  renameAsset,
  deleteAssets,
  removeAttachment,
  setSelectedIds,
  artifactCount,
} = useWorkspaceAssets({
  seedDemoData: workspaceId.value !== 'new',
});

const chatPanelRef = ref<{ openWizard: () => void } | null>(null);
const artifactsPanelRef = ref<{ openImport: () => void } | null>(null);
const isArtifactsOpen = ref(artifactCount.value > 0);

watch(artifactCount, (count, previous) => {
  if (count > (previous ?? 0)) isArtifactsOpen.value = true;
});

function toggleArtifacts(): void {
  isArtifactsOpen.value = !isArtifactsOpen.value;
}

function hideArtifacts(): void {
  isArtifactsOpen.value = false;
}

async function onHeaderImport(): Promise<void> {
  isArtifactsOpen.value = true;
  await nextTick();
  artifactsPanelRef.value?.openImport();
}

function onHeaderCreate(): void {
  chatPanelRef.value?.openWizard();
}

const importedSourceNames = computed(() =>
  assets.value.filter((asset) => asset.origin === 'imported').map((asset) => asset.name),
);

/** A finished agent run adds the source to the list and opens it for editing. */
function onSourceCreated(setup: DataSourceSetup) {
  addFromSetup(setup);
}

function onImportSource(sourceId: string) {
  importFromCatalog(sourceId);
}

function onRenameAsset(payload: { id: string; name: string }) {
  renameAsset(payload.id, payload.name);
}

function onDeleteAssets(ids: string[]) {
  deleteAssets(ids);
}

function onRemoveAttachment(id: string) {
  removeAttachment(id);
}

function onPublishArtifacts() {
  // POC: selection-driven publish; wire to API later.
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[#F1F1F1]">
    <!-- Workspace header -->
    <header class="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#E2E2E2] bg-white px-5 py-3">
      <div class="flex min-w-0 items-center gap-3">
        <NuxtLink
          to="/workspace"
          class="flex h-8 w-8 items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:bg-[#F1F1F1] hover:text-[#25262E]"
          title="Back to workspaces"
          aria-label="Back to workspaces"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
        <h1 class="min-w-0 text-base font-semibold text-[#25262E]">
          <input
            v-if="isEditingName"
            ref="nameInputRef"
            v-model="nameDraft"
            type="text"
            class="h-8 min-w-[10rem] max-w-sm rounded border border-[#3B1770] bg-white px-1.5 text-base font-semibold text-[#25262E] outline-none"
            aria-label="Workspace name"
            @keydown.enter.prevent="commitNameEdit"
            @keydown.esc.prevent="cancelNameEdit"
            @blur="commitNameEdit"
          />
          <button
            v-else
            type="button"
            class="-mx-1 cursor-text rounded px-1 text-left hover:bg-[#F1F1F1]"
            title="Click to rename"
            @click="startNameEdit"
          >
            {{ workspaceName }}
          </button>
        </h1>
        <template v-if="openAsset">
          <span class="text-sm text-[#C4C4C4]">/</span>
          <span class="text-sm text-[#25262E]">{{ openAsset.name }}</span>
        </template>
      </div>

      <div class="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          class="h-8 rounded-md border border-[#E2E2E2] bg-white px-3 text-sm font-medium text-[#25262E] transition-colors hover:bg-[#F8F6FC] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isEditingSource"
          :title="isEditingSource ? 'Save the source to import' : undefined"
          @click="onHeaderImport"
        >
          Import
        </button>
        <button
          type="button"
          class="h-8 rounded-md bg-[#3B1770] px-3 text-sm font-medium text-white transition-colors hover:bg-[#2F1259] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isEditingSource"
          :title="isEditingSource ? 'Save the source to create with the agent' : undefined"
          @click="onHeaderCreate"
        >
          Create
        </button>
        <button
          type="button"
          class="relative flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          :class="
            isArtifactsOpen
              ? 'bg-[#F5F1FC] text-[#3B1770]'
              : 'text-[#6B6B6B] hover:bg-[#F1F1F1] hover:text-[#25262E]'
          "
          :title="isArtifactsOpen ? 'Hide artifacts' : 'Show artifacts'"
          :aria-label="isArtifactsOpen ? 'Hide artifacts' : 'Show artifacts'"
          :aria-pressed="isArtifactsOpen"
          @click="toggleArtifacts"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
          </svg>
          <span
            v-if="!isArtifactsOpen && artifactCount"
            class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3B1770] px-1 text-[9px] font-medium text-white"
          >
            {{ artifactCount }}
          </span>
        </button>
      </div>
    </header>

    <!-- Chat (and editor) fill the workspace; artifacts float when shown -->
    <div class="relative flex min-h-0 flex-1 overflow-hidden">
      <!-- Agent stays mounted so the thread is kept while editing -->
      <aside
        v-show="!isEditingSource"
        class="relative flex min-h-0 flex-col bg-white"
        :class="isEditorOpen ? 'w-[40%] flex-shrink-0 border-r border-[#E2E2E2]' : 'min-w-0 flex-1'"
      >
        <div class="flex flex-shrink-0 items-center gap-2 border-b border-[#E2E2E2] px-4 py-2.5">
          <span class="text-sm font-medium text-[#25262E]">Agent</span>
        </div>

        <div class="min-h-0 flex-1">
          <SimbaChatPanel
            ref="chatPanelRef"
            :has-sources="assets.length > 0"
            :imported-source-names="importedSourceNames"
            @created="onSourceCreated"
            @import="onImportSource"
          />
        </div>
      </aside>

      <!-- Preview while chatting; full editor while editing (agent is hidden) -->
      <section v-if="isEditorOpen" class="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <LegacyBuilderPanel
          :mode="sourceViewMode"
          @edit="startEdit"
          @save="saveEdits"
          @close="closeEditor"
        />
      </section>

      <aside
        v-if="isArtifactsOpen"
        class="absolute bottom-3 right-3 top-3 z-20 flex w-[22rem] flex-col overflow-hidden rounded-xl border border-[#E2E2E2] bg-white shadow-lg"
      >
        <AssetListPanel
          ref="artifactsPanelRef"
          :assets="assets"
          :attachments="attachments"
          :open-asset-id="openAssetId"
          :selected-ids="selectedIds"
          :can-publish="canPublish"
          @open="openEditor"
          @import="onImportSource"
          @rename="onRenameAsset"
          @delete="onDeleteAssets"
          @remove-attachment="onRemoveAttachment"
          @publish="onPublishArtifacts"
          @hide="hideArtifacts"
          @update:selected-ids="setSelectedIds"
        />
      </aside>
    </div>
  </div>
</template>
