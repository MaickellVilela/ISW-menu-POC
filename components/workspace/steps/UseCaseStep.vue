<script setup lang="ts">
import { ref, computed } from 'vue';
import type { UseCasePayload } from '~/composables/useDataSourceFlow';

const emit = defineEmits<{ submit: [payload: UseCasePayload] }>();

const description = ref('');
const fileName = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const canSubmit = computed(() => description.value.trim().length > 0);

function openFilePicker() {
  fileInput.value?.click();
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  fileName.value = target.files?.[0]?.name ?? null;
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) fileName.value = file.name;
}

function clearFile() {
  fileName.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function submit() {
  if (!canSubmit.value) return;
  emit('submit', { description: description.value.trim(), fileName: fileName.value });
}
</script>

<template>
  <div class="rounded-xl border border-[#E2E2E2] bg-white p-4">
    <p class="text-sm font-medium text-[#25262E]">Business use case</p>
    <p class="mt-0.5 text-xs text-[#6B6B6B]">
      What are you trying to solve? For example: "Review marketing campaign results."
    </p>

    <textarea
      v-model="description"
      rows="3"
      placeholder="Describe the use case or questions you want to answer with this data"
      class="mt-3 w-full resize-none rounded-lg border border-[#E2E2E2] px-3 py-2 text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:border-[#3B1770] focus:outline-none"
    ></textarea>

    <div
      class="mt-3 cursor-pointer rounded-lg border border-dashed px-4 py-4 text-center transition-colors"
      :class="isDragging ? 'border-[#3B1770] bg-[#F5F1FC]' : 'border-[#D8D8D8] hover:border-[#3B1770]'"
      @click="openFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!fileName">
        <svg viewBox="0 0 24 24" class="mx-auto h-5 w-5 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" />
        </svg>
        <p class="mt-1.5 text-xs text-[#6B6B6B]">Choose a file or drag &amp; drop it here</p>
        <p class="text-[10px] text-[#9A9A9A]">.Doc, PDF, images up to 50MB</p>
      </template>
      <div v-else class="flex items-center justify-center gap-2 text-xs text-[#25262E]" @click.stop>
        <svg viewBox="0 0 24 24" class="h-4 w-4 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 3v4a1 1 0 0 0 1 1h4M8 3h6l6 6v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        </svg>
        <span class="max-w-[240px] truncate">{{ fileName }}</span>
        <button type="button" class="text-[#9A9A9A] hover:text-[#3B1770]" title="Remove file" @click="clearFile">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />
    </div>

    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canSubmit"
        @click="submit"
      >
        Continue
      </button>
    </div>
  </div>
</template>
