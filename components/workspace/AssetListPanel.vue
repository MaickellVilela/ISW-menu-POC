<script setup lang="ts">
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import type { WorkspaceAsset } from '~/composables/useWorkspaceAssets';

defineProps<{
  assets: WorkspaceAsset[];
  openAssetId: string | null;
}>();

const emit = defineEmits<{ open: [id: string] }>();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <div class="flex flex-shrink-0 items-center justify-between border-b border-[#E2E2E2] px-4 py-2.5">
      <span class="text-sm font-medium text-[#25262E]">Output</span>
      <span class="text-[11px] text-[#9A9A9A]">{{ assets.length }}</span>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
      <button
        v-for="asset in assets"
        :key="asset.id"
        type="button"
        class="mb-1 flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors"
        :class="
          asset.id === openAssetId
            ? 'border-[#3B1770] bg-[#F5F1FC]'
            : 'border-transparent hover:border-[#E2E2E2] hover:bg-[#F8F6FC]'
        "
        @click="emit('open', asset.id)"
      >
        <img
          v-if="asset.connector"
          :src="CONNECTOR_ICONS[asset.connector]"
          alt=""
          class="mt-0.5 h-4 w-4 flex-shrink-0 object-contain"
        />
        <span v-else class="mt-1 h-3 w-3 flex-shrink-0 rounded-sm bg-[#D8D8D8]" aria-hidden="true"></span>

        <span class="min-w-0 flex-1">
          <span class="block truncate text-[12px] font-medium text-[#25262E]">{{ asset.name }}</span>
          <span class="block truncate text-[11px] text-[#9A9A9A]">{{ asset.subtitle }}</span>
        </span>
      </button>

      <p v-if="!assets.length" class="px-2 py-2 text-[11px] text-[#C4C4C4]">Nothing here yet</p>
    </div>
  </div>
</template>
