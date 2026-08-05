<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ConnectionOption } from '~/composables/useDataSourceFlow';

const props = defineProps<{
  connections: ConnectionOption[];
  selectedId: string | null;
}>();
const emit = defineEmits<{ 'update:selectedId': [id: string] }>();

const search = ref('');

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return props.connections;
  return props.connections.filter((connection) =>
    `${connection.name} ${connection.type}`.toLowerCase().includes(term),
  );
});
</script>

<template>
  <div>
    <p class="text-sm font-semibold text-[#25262E]">Select a connection</p>
    <p class="mt-1 text-xs text-[#6B6B6B]">
      Select an existing connection or create a new one to continue creating the data source.
    </p>

    <div class="relative mt-3">
      <svg
        viewBox="0 0 24 24"
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9A9A]"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
      </svg>
      <input
        v-model="search"
        type="text"
        placeholder="Search connections..."
        class="w-full rounded-lg border border-[#E2E2E2] py-2 pl-9 pr-3 text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:border-[#3B1770] focus:outline-none"
      />
    </div>

    <div class="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
      <button
        v-for="connection in filtered"
        :key="connection.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors"
        :class="
          props.selectedId === connection.id
            ? 'border-[#3B1770] bg-[#F5F1FC]'
            : 'border-[#E2E2E2] hover:border-[#3B1770] hover:bg-[#F8F6FC]'
        "
        @click="emit('update:selectedId', connection.id)"
      >
        <svg
          v-if="connection.kind === 'new'"
          viewBox="0 0 24 24"
          class="h-5 w-5 flex-shrink-0 text-[#6B6B6B]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" stroke-linecap="round" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          class="h-5 w-5 flex-shrink-0 text-[#3B1770]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>

        <span class="min-w-0 flex-1 truncate text-sm font-medium text-[#25262E]">{{ connection.name }}</span>

        <span v-if="connection.type" class="flex-shrink-0 text-[10px] uppercase tracking-wide text-[#9A9A9A]">
          {{ connection.type }}
        </span>
      </button>

      <p v-if="!filtered.length" class="px-1 py-3 text-xs text-[#9A9A9A]">No connections match your search.</p>
    </div>
  </div>
</template>
