<script setup lang="ts">
import type { OutputPreview } from '~/composables/useDataSourceCanvas';

const props = defineProps<{
  open: boolean;
  preview: OutputPreview;
}>();

const emit = defineEmits<{
  close: [];
  export: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('close')"
    >
      <section
        class="flex max-h-[min(44rem,calc(100vh-2rem))] w-[min(68rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Output preview"
      >
        <header class="flex flex-shrink-0 items-start justify-between gap-4 border-b border-[#E2E2E2] px-6 py-5">
          <div>
            <h2 class="text-xl font-semibold text-[#25262E]">Preview</h2>
            <p class="mt-1 text-sm text-[#667085]">{{ preview.sourceLabel }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
            aria-label="Close preview"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-auto px-6 py-4">
          <table v-if="preview.columns.length > 0" class="min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th
                  v-for="column in preview.columns"
                  :key="column"
                  class="sticky top-0 min-w-40 border-b border-[#D8DCE2] bg-white px-3 py-2.5 text-xs font-semibold text-[#25262E]"
                >
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in preview.rows" :key="index">
                <td
                  v-for="column in preview.columns"
                  :key="column"
                  class="max-w-64 truncate border-b border-[#EAEAEA] px-3 py-3 text-sm text-[#3F3F46]"
                  :title="row[column]"
                >
                  {{ row[column] }}
                </td>
              </tr>
            </tbody>
          </table>

          <div v-else class="py-16 text-center">
            <p class="text-sm font-medium text-[#25262E]">No columns available to preview</p>
            <p class="mt-1 text-xs text-[#667085]">Connect tables and set an output to preview the result.</p>
          </div>
        </div>

        <footer class="flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-6 py-4">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('close')"
          >
            Close
          </button>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
            :disabled="preview.columns.length === 0"
            @click="emit('export')"
          >
            Export
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
