<script setup lang="ts">
import { computed } from 'vue';
import SimbaChatPanel from '~/components/workspace/SimbaChatPanel.vue';
import LegacyBuilderPanel from '~/components/workspace/LegacyBuilderPanel.vue';
import AssetListPanel from '~/components/workspace/AssetListPanel.vue';
import { useWorkspaceAssets } from '~/composables/useWorkspaceAssets';
import type { DataSourceSetup } from '~/composables/useDataSourceFlow';

const route = useRoute();

/** Demo catalog — keep in sync with the list page for this POC. */
const WORKSPACE_NAMES: Record<string, string> = {
  new: 'Untitled workspace',
  mkt: 'Marketing analytics',
  hc: 'Healthcare pipeline',
  sales: 'Sales forecasting',
};

const workspaceName = computed(() => {
  const id = String(route.params.id);
  return WORKSPACE_NAMES[id] ?? 'Workspace';
});

const { assets, openAssetId, openAsset, isEditorOpen, openEditor, closeEditor, addFromSetup } =
  useWorkspaceAssets();

/** A finished agent run adds the source to the list and opens it for editing. */
function onSourceCreated(setup: DataSourceSetup) {
  addFromSetup(setup);
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[#F1F1F1]">
    <!-- Workspace header -->
    <header class="flex flex-shrink-0 items-center border-b border-[#E2E2E2] bg-white px-5 py-3">
      <div class="flex items-center gap-3">
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
        <h1 class="text-base font-semibold text-[#25262E]">{{ workspaceName }}</h1>
        <template v-if="openAsset">
          <span class="text-sm text-[#C4C4C4]">/</span>
          <span class="text-sm text-[#25262E]">{{ openAsset.name }}</span>
        </template>
      </div>

    </header>

    <!-- Chat centered with the asset list, or split with the editor once a source exists -->
    <div class="flex min-h-0 flex-1">
      <!-- Agent panel -->
      <aside
        class="relative flex flex-col border-r border-[#E2E2E2] bg-white"
        :class="isEditorOpen ? 'w-[40%] flex-shrink-0' : 'min-w-0 flex-1'"
      >
        <div class="flex flex-shrink-0 items-center gap-2 border-b border-[#E2E2E2] px-4 py-2.5">
          <span class="text-sm font-medium text-[#25262E]">Agent</span>
        </div>

        <div class="min-h-0 flex-1">
          <SimbaChatPanel @created="onSourceCreated" />
        </div>
      </aside>

      <!-- Editor: simulated legacy Classic Builder UI, opened from a source -->
      <section v-if="isEditorOpen" class="flex min-h-0 w-[60%] min-w-0 flex-shrink-0 flex-col bg-white">
        <LegacyBuilderPanel @close="closeEditor" />
      </section>

      <!-- Otherwise the workspace asset list -->
      <aside v-else class="flex w-[300px] min-w-0 flex-shrink-0 flex-col border-l border-[#E2E2E2] bg-white">
        <AssetListPanel :assets="assets" :open-asset-id="openAssetId" @open="openEditor" />
      </aside>
    </div>
  </div>
</template>
