<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DataSourceFile } from '~/composables/dataSourceCatalog';
import DraggableSourceItem from './DraggableSourceItem.vue';

const props = defineProps<{
  files: DataSourceFile[];
}>();

const emit = defineEmits<{
  upload: [file: File];
  remove: [id: string];
}>();

const searchQuery = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const openMenuId = ref<string | null>(null);

const visibleFiles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.files;
  return props.files.filter((file) =>
    `${file.name} ${file.kind}`.toLowerCase().includes(query),
  );
});

function selectUpload(): void {
  fileInput.value?.click();
}

function uploadSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('upload', file);
  input.value = '';
}

function toggleMenu(id: string): void {
  openMenuId.value = openMenuId.value === id ? null : id;
}

function removeFile(id: string): void {
  openMenuId.value = null;
  emit('remove', id);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex-shrink-0 px-3 pb-2 pt-3">
      <label class="relative block">
        <span class="sr-only">Search files</span>
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" stroke-linecap="round" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search files"
          class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white pl-8 pr-2.5 text-xs text-[#25262E] placeholder:text-[#9A9A9A] outline-none focus:border-[#3B1770]"
        />
      </label>
      <p class="mt-2 text-[11px] text-[#7A7A7A]">Drag a file onto the canvas to use it as an entity.</p>
    </div>

    <ul v-if="visibleFiles.length > 0" class="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
      <DraggableSourceItem
        v-for="file in visibleFiles"
        :key="file.id"
        :item="file.sourceItem"
        variant="file"
        :detail="`${file.kind} · ${file.sourceItem.fields.length} fields`"
      >
        <template #actions>
          <div class="relative flex-shrink-0" @click.stop @pointerdown.stop>
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded text-[#52525B] transition-colors hover:bg-[#EDE7F5] hover:text-[#3B1770]"
              :aria-label="`Actions for ${file.name}`"
              :aria-expanded="openMenuId === file.id"
              @click="toggleMenu(file.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            <div
              v-if="openMenuId === file.id"
              class="absolute right-0 top-8 z-20 w-32 rounded-md border border-[#E2E2E2] bg-white p-1 shadow-lg"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-[#B4232D] hover:bg-[#FCEEEF]"
                @click="removeFile(file.id)"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M4 7h16M9 7V4h6v3M8 10v9M12 10v9M16 10v9M6 7l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </template>
      </DraggableSourceItem>
    </ul>

    <div v-else class="flex min-h-0 flex-1 items-center justify-center px-5 text-center">
      <div>
        <p class="text-sm font-medium text-[#25262E]">
          {{ files.length === 0 ? 'No files uploaded' : 'No files found' }}
        </p>
        <p class="mt-1 text-xs text-[#7A7A7A]">
          {{ files.length === 0 ? 'Upload a CSV, Excel, or JSON file.' : 'Try another search.' }}
        </p>
      </div>
    </div>

    <footer class="flex-shrink-0 border-t border-[#EAEAEA] p-3">
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        accept=".csv,.xls,.xlsx,.json"
        @change="uploadSelected"
      />
      <button
        type="button"
        class="w-full rounded-md border border-[#C9CED6] bg-white py-2 text-xs font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:text-[#3B1770]"
        @click="selectUpload"
      >
        Upload new file
      </button>
    </footer>
  </div>
</template>
