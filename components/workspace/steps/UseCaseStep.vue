<script setup lang="ts">
import { ref } from 'vue';
import type { UseCasePayload } from '~/composables/useDataSourceFlow';

const props = defineProps<{ value: UseCasePayload }>();
const emit = defineEmits<{ 'update:value': [payload: UseCasePayload] }>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function patch(partial: Partial<UseCasePayload>) {
  emit('update:value', { ...props.value, ...partial });
}

function openFilePicker() {
  fileInput.value?.click();
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  patch({ fileName: target.files?.[0]?.name ?? null });
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) patch({ fileName: file.name });
}

function clearFile() {
  if (fileInput.value) fileInput.value.value = '';
  patch({ fileName: null });
}
</script>

<template>
  <div>
    <p class="text-sm font-semibold text-[#25262E]">Business use case</p>
    <p class="mt-1 text-xs text-[#6B6B6B]">
      What are you trying to solve? For example: Review marketing campaign results.
    </p>

    <textarea
      :value="props.value.description"
      rows="4"
      placeholder="Describe the use case or questions you want to answer with this data"
      class="mt-3 w-full resize-none rounded-lg border border-[#3B1770] px-3 py-2 text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:outline-none"
      @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
    ></textarea>

    <div
      class="mt-3 cursor-pointer rounded-lg border border-dashed px-4 py-5 text-center transition-colors"
      :class="isDragging ? 'border-[#3B1770] bg-[#F5F1FC]' : 'border-[#D8D8D8] hover:border-[#3B1770]'"
      @click="openFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!props.value.fileName">
        <svg viewBox="0 0 24 24" class="mx-auto h-5 w-5 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" />
        </svg>
        <p class="mt-1.5 text-xs text-[#6B6B6B]">Choose a file or drag &amp; drop it here</p>
        <p class="text-[10px] text-[#9A9A9A]">.Doc, PDF, images up to 50 MB</p>
      </template>
      <div v-else class="flex items-center justify-center gap-2 text-xs text-[#25262E]" @click.stop>
        <svg viewBox="0 0 24 24" class="h-4 w-4 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 3v4a1 1 0 0 0 1 1h4M8 3h6l6 6v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        </svg>
        <span class="max-w-[240px] truncate">{{ props.value.fileName }}</span>
        <button type="button" class="text-[#9A9A9A] hover:text-[#3B1770]" title="Remove file" @click="clearFile">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />
    </div>
  </div>
</template>
