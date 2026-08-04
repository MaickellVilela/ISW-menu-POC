<script setup lang="ts">
import type { ConnectionOption } from '~/composables/useDataSourceFlow';

defineProps<{ connections: ConnectionOption[] }>();
const emit = defineEmits<{ select: [connection: ConnectionOption] }>();
</script>

<template>
  <div class="rounded-xl border border-[#E2E2E2] bg-white p-4">
    <p class="text-sm font-medium text-[#25262E]">Select a connection</p>
    <p class="mt-0.5 text-xs text-[#6B6B6B]">Pick an existing connection or create a new one.</p>

    <div class="mt-3 grid grid-cols-2 gap-2">
      <button
        v-for="connection in connections"
        :key="connection.id"
        type="button"
        class="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[#E2E2E2] px-3 py-4 text-center transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC]"
        @click="emit('select', connection)"
      >
        <svg
          v-if="connection.kind === 'new'"
          viewBox="0 0 24 24"
          class="h-6 w-6 text-[#6B6B6B]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          class="h-6 w-6 text-[#3B1770]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
        <span class="text-sm font-medium text-[#25262E]">{{ connection.name }}</span>
        <span
          v-if="connection.type"
          class="text-[10px] uppercase tracking-wide text-[#9A9A9A]"
        >
          {{ connection.type }}
        </span>
      </button>
    </div>
  </div>
</template>
