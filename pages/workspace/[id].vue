<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import SimbaChatPanel from '~/components/workspace/SimbaChatPanel.vue';
import LegacyBuilderPanel from '~/components/workspace/LegacyBuilderPanel.vue';
import AssetListPanel from '~/components/workspace/AssetListPanel.vue';
import PublishConfirmDialog from '~/components/workspace/PublishConfirmDialog.vue';
import { useLiveCatalog, useWorkspaceAssets } from '~/composables/useWorkspaceAssets';
import { selectedPublishableAssets, type PublishNameDraft } from '~/composables/usePublish';
import { PREVIEW_ITERATION_MS, type DataSourceSetup } from '~/composables/useDataSourceFlow';

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
  restoreLastPreview,
  canRestoreLastPreview,
  startEdit,
  saveEdits,
  endEditing,
  addFromSetup,
  createManualSource,
  importFromCatalog,
  renameAsset,
  deleteAssets,
  removeAttachment,
  setSelectedIds,
  artifactCount,
  publishDrafts,
} = useWorkspaceAssets({
  seedDemoData: workspaceId.value !== 'new',
});

const { names: publishedNames } = useLiveCatalog();

const artifactsPanelRef = ref<{ openImport: () => void } | null>(null);
const isArtifactsOpen = ref(false);
const isPublishOpen = ref(false);
const publishToast = ref<string[] | null>(null);

const TOAST_MS = 4000;
let publishToastTimer: ReturnType<typeof setTimeout> | null = null;

function hidePublishToast(): void {
  if (publishToastTimer !== null) clearTimeout(publishToastTimer);
  publishToastTimer = null;
  publishToast.value = null;
}

function publishToastLines(names: string[]): string[] {
  return names.map((name) => `${name} published to Data Sources`);
}

function showPublishToast(names: string[]): void {
  hidePublishToast();
  publishToast.value = publishToastLines(names);
  publishToastTimer = setTimeout(hidePublishToast, TOAST_MS);
}

const publishSources = computed(() =>
  selectedPublishableAssets(selectedIds.value, assets.value),
);

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
  createManualSource();
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

const isPreviewUpdating = ref(false);
let previewUpdateTimer: ReturnType<typeof setTimeout> | null = null;

function stopPreviewUpdate(): void {
  if (previewUpdateTimer !== null) clearTimeout(previewUpdateTimer);
  previewUpdateTimer = null;
  isPreviewUpdating.value = false;
}

/** Prototype: an "edit" prompt shimmers the open preview while the agent "applies" changes. */
function onIteratePreview(): void {
  if (!isEditorOpen.value || isEditingSource.value) return;
  stopPreviewUpdate();
  isPreviewUpdating.value = true;
  previewUpdateTimer = setTimeout(() => {
    previewUpdateTimer = null;
    isPreviewUpdating.value = false;
  }, PREVIEW_ITERATION_MS);
}

watch(isEditingSource, (editing) => {
  if (editing) stopPreviewUpdate();
});

watch(isEditorOpen, (open) => {
  if (!open) stopPreviewUpdate();
});

onBeforeUnmount(() => {
  stopPreviewUpdate();
  hidePublishToast();
});

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
  if (!canPublish.value) return;
  isPublishOpen.value = true;
}

function onConfirmPublish(drafts: PublishNameDraft[]) {
  publishDrafts(drafts);
  setSelectedIds([]);
  isPublishOpen.value = false;
  hideArtifacts();
  showPublishToast(drafts.map((draft) => draft.name));
}

function onClosePublish() {
  isPublishOpen.value = false;
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
          class="h-8 rounded-md border border-[#E2E2E2] bg-white px-3 text-sm font-medium text-[#25262E] transition-colors hover:bg-[#F8F6FC] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isEditingSource"
          :title="isEditingSource ? 'Save the source to create another' : 'Create a data source yourself, without using the agent.'"
          @click="onHeaderCreate"
        >
          Create Data Source
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
        <div class="flex h-12 flex-shrink-0 items-center justify-between gap-2 border-b border-[#E2E2E2] px-4">
          <span class="text-sm font-medium text-[#25262E]">Agent</span>
          <button
            v-if="canRestoreLastPreview"
            type="button"
            class="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[#25262E] transition-colors hover:bg-[#F1F1F1]"
            title="Open the last previewed item"
            aria-label="Open the last previewed item"
            @click="restoreLastPreview"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M12 3C17.392 3 21.878 6.88 22.819 12C21.879 17.12 17.392 21 12 21C6.60803 21 2.12203 17.12 1.18103 12C2.12103 6.88 6.60803 3 12 3ZM12 19C14.0395 18.9996 16.0184 18.3068 17.6129 17.0352C19.2074 15.7635 20.3229 13.9883 20.777 12C20.3213 10.0133 19.205 8.24 17.6107 6.97003C16.0163 5.70005 14.0383 5.00853 12 5.00853C9.96173 5.00853 7.98372 5.70005 6.38941 6.97003C4.79509 8.24 3.6788 10.0133 3.22303 12C3.67713 13.9883 4.7927 15.7635 6.38717 17.0352C7.98164 18.3068 9.96056 18.9996 12 19ZM12 16.5C10.8066 16.5 9.66196 16.0259 8.81805 15.182C7.97414 14.3381 7.50003 13.1935 7.50003 12C7.50003 10.8065 7.97414 9.66193 8.81805 8.81802C9.66196 7.97411 10.8066 7.5 12 7.5C13.1935 7.5 14.3381 7.97411 15.182 8.81802C16.0259 9.66193 16.5 10.8065 16.5 12C16.5 13.1935 16.0259 14.3381 15.182 15.182C14.3381 16.0259 13.1935 16.5 12 16.5ZM12 14.5C12.6631 14.5 13.299 14.2366 13.7678 13.7678C14.2366 13.2989 14.5 12.663 14.5 12C14.5 11.337 14.2366 10.7011 13.7678 10.2322C13.299 9.76339 12.6631 9.5 12 9.5C11.337 9.5 10.7011 9.76339 10.2323 10.2322C9.76342 10.7011 9.50003 11.337 9.50003 12C9.50003 12.663 9.76342 13.2989 10.2323 13.7678C10.7011 14.2366 11.337 14.5 12 14.5Z" />
            </svg>
            Preview
          </button>
        </div>

        <div class="min-h-0 flex-1">
          <SimbaChatPanel
            :has-sources="assets.length > 0"
            :imported-source-names="importedSourceNames"
            @created="onSourceCreated"
            @import="onImportSource"
            @iterate="onIteratePreview"
          />
        </div>
      </aside>

      <!-- Preview while chatting; full editor while editing (agent is hidden) -->
      <section v-if="isEditorOpen" class="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <LegacyBuilderPanel
          :mode="sourceViewMode"
          :updating="isPreviewUpdating"
          :sources="assets"
          :selected-source-id="openAssetId"
          @edit="startEdit"
          @save="saveEdits"
          @end="endEditing"
          @close="closeEditor"
          @select="openEditor"
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

    <PublishConfirmDialog
      :open="isPublishOpen"
      :sources="publishSources"
      :published-names="publishedNames"
      @confirm="onConfirmPublish"
      @cancel="onClosePublish"
    />

    <Teleport to="body">
      <div
        v-if="publishToast"
        class="fixed right-4 top-4 z-[60] flex w-[min(26rem,calc(100vw-2rem))] gap-3 rounded-xl border border-[#BBF7D0] bg-[#E8F6EF] px-4 py-4 shadow-lg"
        :class="publishToast.length === 1 ? 'items-center' : 'items-start'"
        role="status"
        aria-live="polite"
      >
        <span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#166534] text-white" aria-hidden="true">
          <svg viewBox="0 0 16 16" class="h-4 w-4" fill="none">
            <path d="M3.5 8.2l3 3 6-6.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="min-w-0 flex-1 space-y-1">
          <p
            v-for="line in publishToast"
            :key="line"
            class="text-[15px] font-medium leading-5 text-[#166534]"
          >
            {{ line }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#166534] transition-colors hover:bg-[#166534]/10"
          aria-label="Dismiss notification"
          @click="hidePublishToast"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>
