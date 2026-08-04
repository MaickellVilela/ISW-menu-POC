<script setup lang="ts">
import { ref, watch } from 'vue';
import SimbaChatPanel from '~/components/workspace/SimbaChatPanel.vue';
import DataSourceBuilder from '~/components/workspace/DataSourceBuilder.vue';

type WorkspaceTab = 'simba' | 'manual';

// Demo control: simulates whether this user owns a Simba Intelligence license.
const hasSimbaLicense = ref(true);

const activeTab = ref<WorkspaceTab>('simba');

// License drives the primary entry point: licensed users land on Simba,
// everyone else is routed to the manual builder.
watch(
  hasSimbaLicense,
  (licensed) => {
    activeTab.value = licensed ? 'simba' : 'manual';
  },
  { immediate: true },
);

function selectTab(tab: WorkspaceTab) {
  if (tab === 'simba' && !hasSimbaLicense.value) return;
  activeTab.value = tab;
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[#F1F1F1]">
    <!-- Workspace header -->
    <header class="group flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] bg-white px-5 py-3">
      <div class="flex items-center gap-3">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7l8-4 8 4-8 4-8-4z" />
            <path d="M4 12l8 4 8-4M4 17l8 4 8-4" />
          </svg>
        </span>
        <div class="leading-tight">
          <h1 class="text-base font-semibold text-[#25262E]">Agentic Workspace</h1>
          <p class="text-xs text-[#9A9A9A]">Proposal — modern data source builder (archived)</p>
        </div>
      </div>

      <!-- Demo license switch (revealed on hover) -->
      <label
        class="flex cursor-pointer select-none items-center gap-2.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100"
        title="Toggle to preview the licensed vs unlicensed experience"
      >
        <span class="text-xs font-medium text-[#6B6B6B]">Simba Intelligence license</span>
        <button
          type="button"
          role="switch"
          :aria-checked="hasSimbaLicense"
          class="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors"
          :class="hasSimbaLicense ? 'bg-[#3B1770]' : 'bg-[#D8D8D8]'"
          @click="hasSimbaLicense = !hasSimbaLicense"
        >
          <span
            class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            :class="hasSimbaLicense ? 'translate-x-4' : 'translate-x-0.5'"
          ></span>
        </button>
      </label>
    </header>

    <!-- Tab bar -->
    <div class="flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] bg-white px-5">
      <nav class="flex items-center gap-1" role="tablist" aria-label="Data source creation mode">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'simba'"
          :disabled="!hasSimbaLicense"
          class="relative flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors"
          :class="[
            activeTab === 'simba'
              ? 'border-[#3B1770] text-[#3B1770]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#3B1770]',
            !hasSimbaLicense ? 'cursor-not-allowed opacity-50 hover:text-[#6B6B6B]' : '',
          ]"
          @click="selectTab('simba')"
        >
          Agent
          <svg v-if="!hasSimbaLicense" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'manual'"
          class="flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'manual'
              ? 'border-[#3B1770] text-[#3B1770]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#3B1770]'
          "
          @click="selectTab('manual')"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <path d="M6.5 10v4a1 1 0 0 0 1 1H14" />
          </svg>
          Classic Builder
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="min-h-0 flex-1">
      <!-- Simba: the conversational interface, front and center -->
      <div v-if="activeTab === 'simba'" class="h-full min-h-0">
        <SimbaChatPanel />
      </div>

      <!-- Manual: the traditional Data Source Creation experience -->
      <div v-else class="flex h-full flex-col">
        <div
          v-if="!hasSimbaLicense"
          class="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#E2E2E2] bg-[#F5F1FC] px-5 py-2.5"
        >
          <p class="text-xs text-[#3B1770]">
            Create data sources with natural language — available with the Agent.
          </p>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4B1E8C]"
          >
            Learn more
          </button>
        </div>
        <div class="min-h-0 flex-1">
          <DataSourceBuilder />
        </div>
      </div>
    </div>
  </div>
</template>
