<script setup lang="ts">
import { computed, ref } from 'vue';
import SimbaChatPanel from '~/components/workspace/SimbaChatPanel.vue';
import LegacyBuilderPanel from '~/components/workspace/LegacyBuilderPanel.vue';

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

// Demo control: simulates whether this user owns a Simba Intelligence license.
const hasSimbaLicense = ref(true);
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[#F1F1F1]">
    <!-- Workspace header -->
    <header class="group flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] bg-white px-5 py-3">
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

    <!-- Side-by-side: Agent 40% | Builder 60% -->
    <div class="flex min-h-0 flex-1">
      <!-- Agent panel -->
      <aside class="relative flex w-[40%] flex-shrink-0 flex-col border-r border-[#E2E2E2] bg-white">
        <div class="flex flex-shrink-0 items-center gap-2 border-b border-[#E2E2E2] px-4 py-2.5">
          <span class="text-sm font-medium text-[#25262E]">Agent</span>
          <svg
            v-if="!hasSimbaLicense"
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 text-[#9A9A9A]"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <div class="relative min-h-0 flex-1">
          <div class="h-full min-h-0" :class="{ 'pointer-events-none opacity-40': !hasSimbaLicense }">
            <SimbaChatPanel />
          </div>

          <!-- Unlicensed overlay -->
          <div
            v-if="!hasSimbaLicense"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 px-6 text-center"
          >
            <p class="text-xs leading-relaxed text-[#3B1770]">
              Create data sources with natural language — available with the Agent.
            </p>
            <button
              type="button"
              class="rounded-md bg-[#3B1770] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4B1E8C]"
            >
              Learn more
            </button>
          </div>
        </div>
      </aside>

      <!-- Builder: simulated legacy Classic Builder UI (no panel title) -->
      <section class="flex min-h-0 min-w-0 w-[60%] flex-col bg-white">
        <LegacyBuilderPanel />
      </section>
    </div>
  </div>
</template>
