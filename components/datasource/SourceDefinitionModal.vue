<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  addTags,
  canSaveSourceDefinition,
  cloneSourceDefinition,
  removeTag,
  sanitizeSourceDefinition,
  tagsFromDraft,
  type SourceDefinition,
} from '~/composables/sourceDefinition';

const props = defineProps<{
  open: boolean;
  definition: SourceDefinition;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [definition: SourceDefinition];
}>();

const nameInput = ref<HTMLInputElement | null>(null);
const tagInput = ref<HTMLInputElement | null>(null);
const name = ref('');
const description = ref('');
const tags = ref<string[]>([]);
const tagDraft = ref('');

const draft = computed<SourceDefinition>(() => ({
  name: name.value,
  description: description.value,
  tags: addTags(tags.value, tagsFromDraft(tagDraft.value)),
}));

const canSave = computed(() => canSaveSourceDefinition(draft.value, props.definition));

function reset(): void {
  const current = cloneSourceDefinition(props.definition);
  name.value = current.name;
  description.value = current.description;
  tags.value = current.tags;
  tagDraft.value = '';
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    reset();
    await nextTick();
    nameInput.value?.focus();
    nameInput.value?.select();
  },
);

function commitTagDraft(): void {
  const next = tagsFromDraft(tagDraft.value);
  if (next.length === 0) {
    tagDraft.value = '';
    return;
  }
  tags.value = addTags(tags.value, next);
  tagDraft.value = '';
}

function onTagKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    commitTagDraft();
    return;
  }
  if (event.key === 'Backspace' && !tagDraft.value && tags.value.length > 0) {
    tags.value = tags.value.slice(0, -1);
  }
}

function onTagRemove(tag: string): void {
  tags.value = removeTag(tags.value, tag);
}

function clearTags(): void {
  tags.value = [];
  tagDraft.value = '';
  tagInput.value?.focus();
}

function save(): void {
  if (!canSave.value) return;
  emit('save', sanitizeSourceDefinition(draft.value));
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <section
        class="flex w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-definition-title"
      >
        <header class="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <h2 id="source-definition-title" class="text-xl font-semibold text-[#25262E]">
            Source Definition
          </h2>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#5A6270] outline-none hover:bg-[#F3F3F4] hover:text-[#25262E] focus-visible:ring-2 focus-visible:ring-[#6F42A5]"
            aria-label="Close source definition"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-5 px-6 py-4">
          <label for="source-definition-name" class="pt-2 text-sm text-[#25262E]">Name</label>
          <input
            id="source-definition-name"
            ref="nameInput"
            v-model="name"
            type="text"
            class="h-10 w-full rounded-md border border-[#C9CED6] px-3 text-sm text-[#25262E] outline-none focus:border-[#6F42A5]"
          />

          <label for="source-definition-description" class="pt-2 text-sm text-[#25262E]">Description</label>
          <textarea
            id="source-definition-description"
            v-model="description"
            rows="3"
            class="min-h-[4.5rem] w-full resize-y rounded-md border border-[#C9CED6] px-3 py-2 text-sm leading-relaxed text-[#25262E] outline-none focus:border-[#6F42A5]"
          />

          <span id="source-definition-tags-label" class="pt-2 text-sm text-[#25262E]">Tags</span>
          <div
            class="flex min-h-10 items-center gap-1.5 rounded-md border border-[#C9CED6] px-2 py-1 focus-within:border-[#6F42A5]"
            @click="tagInput?.focus()"
          >
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <span
                v-for="tag in tags"
                :key="tag"
                class="inline-flex max-w-full items-center gap-1 rounded bg-[#E8EAED] px-1.5 py-0.5 text-xs text-[#5A6270]"
              >
                <span class="truncate">{{ tag }}</span>
                <button
                  type="button"
                  class="flex-shrink-0 text-[#7A7A7A] hover:text-[#25262E]"
                  :aria-label="`Remove tag ${tag}`"
                  @click.stop="onTagRemove(tag)"
                >
                  <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
                  </svg>
                </button>
              </span>
              <input
                ref="tagInput"
                v-model="tagDraft"
                type="text"
                aria-labelledby="source-definition-tags-label"
                class="min-w-[6rem] flex-1 bg-transparent py-1 text-sm text-[#25262E] outline-none"
                @keydown="onTagKeydown"
                @blur="commitTagDraft"
              />
            </div>
            <button
              v-if="tags.length > 0 || tagDraft"
              type="button"
              class="flex-shrink-0 p-1 text-[#7A7A7A] hover:text-[#25262E]"
              aria-label="Clear tags"
              @click.stop="clearTags"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <footer class="mt-2 flex justify-end gap-2 border-t border-[#E2E2E2] px-6 py-4">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
            :disabled="!canSave"
            @click="save"
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
