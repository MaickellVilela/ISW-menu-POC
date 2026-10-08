<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  MAX_PHRASINGS,
  canAddPhrasing,
  useCertifiedQuestions,
  type CertifiedQuestion,
  type CertifiedQuestionPatch,
} from '~/composables/useCertifiedQuestions';
import { formatAssetModifiedAt } from '~/composables/useWorkspaceAssets';

type ItemTab = 'phrasing' | 'query' | 'comments';
type EditableField = 'question' | 'summary' | 'sql' | 'comment';

const TABS: { id: ItemTab; label: string }[] = [
  { id: 'phrasing', label: 'Phrasing' },
  { id: 'query', label: 'Code' },
  { id: 'comments', label: 'Notes' },
];

const props = defineProps<{
  question: CertifiedQuestion;
  /** Expands, scrolls into view and rings the card, e.g. right after certifying it. */
  highlighted?: boolean;
}>();

const { updateQuestion, addPhrasing, removePhrasing, removeQuestion } = useCertifiedQuestions();

const root = ref<HTMLElement | null>(null);
const expanded = ref(true);
const activeTab = ref<ItemTab>('phrasing');
const editing = ref<EditableField | null>(null);
const draft = ref('');
const isAddingPhrasing = ref(false);
const phrasingDraft = ref('');
const confirmingRemove = ref(false);

const canAdd = computed(() => canAddPhrasing(props.question.phrasings));
const showEditedBy = computed(
  () => props.question.updatedBy !== null && props.question.updatedBy !== props.question.createdBy,
);

watch(
  () => props.highlighted,
  async (highlighted) => {
    if (!highlighted) return;
    expanded.value = true;
    await nextTick();
    root.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
  { immediate: true },
);

async function startEdit(field: EditableField): Promise<void> {
  editing.value = field;
  draft.value = props.question[field];
  await nextTick();
  root.value?.querySelector<HTMLElement>(`[data-edit="${field}"]`)?.focus();
}

function cancelEdit(): void {
  editing.value = null;
  draft.value = '';
}

function saveEdit(): void {
  const field = editing.value;
  if (!field) return;
  const value = field === 'sql' ? draft.value.trimEnd() : draft.value.trim();
  // The question and its query can't be blank; the comment can.
  if (!value && field !== 'comment') return;
  if (value !== props.question[field]) {
    const patch: CertifiedQuestionPatch = {};
    patch[field] = value;
    updateQuestion(props.question.id, patch);
  }
  cancelEdit();
}

async function startAddPhrasing(): Promise<void> {
  isAddingPhrasing.value = true;
  phrasingDraft.value = '';
  await nextTick();
  root.value?.querySelector<HTMLElement>('[data-edit="phrasing"]')?.focus();
}

function commitPhrasing(): void {
  if (addPhrasing(props.question.id, phrasingDraft.value)) {
    phrasingDraft.value = '';
    if (!canAddPhrasing(props.question.phrasings)) isAddingPhrasing.value = false;
  }
}

function cancelPhrasing(): void {
  isAddingPhrasing.value = false;
  phrasingDraft.value = '';
}
</script>

<template>
  <article
    ref="root"
    class="overflow-hidden rounded-xl border bg-white transition-shadow duration-500"
    :class="highlighted ? 'border-[#3B1770] ring-4 ring-[#D4C4EF]' : 'border-[#E2E2E2]'"
  >
    <!-- Header -->
    <header class="flex items-start gap-3 bg-[#F5F1FC] px-5 py-4">
      <svg viewBox="0 0 24 24" class="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke-linejoin="round" />
        <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>

      <div v-if="editing === 'question'" class="min-w-0 flex-1">
        <label class="sr-only" :for="`cq-title-${question.id}`">Question</label>
        <input
          :id="`cq-title-${question.id}`"
          v-model="draft"
          data-edit="question"
          type="text"
          class="h-9 w-full rounded-md border border-[#3B1770] bg-white px-2 text-[15px] font-medium text-[#25262E] outline-none"
          @keydown.enter.prevent="saveEdit"
          @keydown.esc.prevent="cancelEdit"
        />
        <p class="mt-1.5 text-xs text-[#6B6B6B]">
          Changing the question doesn't change its code. Check the Code tab still answers it.
        </p>
        <div class="mt-2 flex gap-2">
          <button type="button" class="rounded bg-[#3B1770] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#4B1E8C]" @click="saveEdit">Save</button>
          <button type="button" class="rounded px-2 py-1 text-[12px] font-medium text-[#6B6B6B] hover:bg-white" @click="cancelEdit">Cancel</button>
        </div>
      </div>
      <h3 v-else class="min-w-0 flex-1 text-[15px] font-medium leading-snug text-[#3B1770]">
        {{ question.question }}
      </h3>

      <div class="flex flex-shrink-0 items-center gap-1">
        <button
          v-if="editing !== 'question'"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-[#3B1770] transition-colors hover:bg-white"
          title="Edit question"
          aria-label="Edit question"
          @click="startEdit('question')"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16v4z" stroke-linejoin="round" />
            <path d="M13.5 6.5l4 4" />
          </svg>
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-[#3B1770] transition-colors hover:bg-white"
          :title="expanded ? 'Collapse' : 'Expand'"
          :aria-label="expanded ? 'Collapse question' : 'Expand question'"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M5 12h14" stroke-linecap="round" />
            <path v-if="!expanded" d="M12 5v14" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </header>

    <template v-if="expanded">
      <!-- Tabs -->
      <div class="flex border-b border-[#EAEAEA] px-4" role="tablist">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          class="px-3 py-2.5 text-sm font-medium"
          :class="activeTab === tab.id ? 'border-b-2 border-[#3B1770] text-[#3B1770]' : 'text-[#667085] hover:text-[#25262E]'"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="px-5 py-4">
        <!-- Phrasing -->
        <section v-if="activeTab === 'phrasing'">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">
            Associated phrasings
            <span class="ml-1 font-normal tracking-normal">({{ question.phrasings.length }}/{{ MAX_PHRASINGS }})</span>
          </p>
          <ul v-if="question.phrasings.length" class="mt-3 space-y-2">
            <li
              v-for="(phrase, index) in question.phrasings"
              :key="phrase"
              class="group flex items-center gap-3 text-sm text-[#25262E]"
            >
              <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#A78BDA]" aria-hidden="true" />
              <span class="min-w-0 flex-1">{{ phrase }}</span>
              <button
                type="button"
                class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[#9A9A9A] opacity-0 transition-opacity hover:bg-[#F1ECFA] hover:text-[#3B1770] focus:opacity-100 group-hover:opacity-100"
                :aria-label="`Remove phrasing ${phrase}`"
                @click="removePhrasing(question.id, index)"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
                </svg>
              </button>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-[#9A9A9A]">No phrasings yet. Add the other ways people ask this.</p>

          <div v-if="isAddingPhrasing" class="mt-3 flex items-center gap-2">
            <label class="sr-only" :for="`cq-phrasing-${question.id}`">New phrasing</label>
            <input
              :id="`cq-phrasing-${question.id}`"
              v-model="phrasingDraft"
              data-edit="phrasing"
              type="text"
              placeholder="Another way to ask this…"
              class="h-9 min-w-0 flex-1 rounded-md border border-[#E2E2E2] px-3 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
              @keydown.enter.prevent="commitPhrasing"
              @keydown.esc.prevent="cancelPhrasing"
            />
            <button
              type="button"
              class="h-9 rounded-md bg-[#3B1770] px-3 text-[12px] font-medium text-white hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!phrasingDraft.trim()"
              @click="commitPhrasing"
            >
              Add
            </button>
            <button type="button" class="h-9 rounded-md px-2 text-[12px] font-medium text-[#6B6B6B] hover:bg-[#F7F7F8]" @click="cancelPhrasing">
              Cancel
            </button>
          </div>
          <button
            v-else-if="canAdd"
            type="button"
            class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#3B1770] hover:underline"
            @click="startAddPhrasing"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
            Add phrasing
          </button>
          <p v-else class="mt-3 text-xs text-[#9A9A9A]">You've reached {{ MAX_PHRASINGS }} phrasings. Remove one to add another.</p>
        </section>

        <!-- Code -->
        <section v-else-if="activeTab === 'query'" class="space-y-4">
          <div>
            <div class="flex items-center justify-between">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">Summary</p>
              <button
                v-if="editing !== 'summary'"
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md text-[#9A9A9A] transition-colors hover:bg-[#F1F1F1] hover:text-[#3B1770]"
                title="Edit summary"
                aria-label="Edit summary"
                @click="startEdit('summary')"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16v4z" stroke-linejoin="round" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
              </button>
            </div>
            <template v-if="editing === 'summary'">
              <textarea
                v-model="draft"
                data-edit="summary"
                rows="3"
                aria-label="Summary"
                class="mt-1.5 w-full resize-y rounded-lg border border-[#3B1770] bg-white px-4 py-3 text-sm leading-relaxed text-[#25262E] outline-none"
                @keydown.esc.prevent="cancelEdit"
              ></textarea>
              <div class="mt-2 flex gap-2">
                <button type="button" class="rounded bg-[#3B1770] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#4B1E8C]" @click="saveEdit">Save</button>
                <button type="button" class="rounded px-2 py-1 text-[12px] font-medium text-[#6B6B6B] hover:bg-[#F7F7F8]" @click="cancelEdit">Cancel</button>
              </div>
            </template>
            <p v-else-if="question.summary" class="mt-1.5 rounded-lg border border-[#E2E2E2] bg-[#F8F8FA] px-4 py-3 text-sm leading-relaxed text-[#25262E]">
              {{ question.summary }}
            </p>
            <p v-else class="mt-1.5 rounded-lg border border-dashed border-[#E2E2E2] px-4 py-3 text-sm text-[#9A9A9A]">
              No summary yet.
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">Code</p>
              <button
                v-if="editing !== 'sql'"
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md text-[#9A9A9A] transition-colors hover:bg-[#F1F1F1] hover:text-[#3B1770]"
                title="Edit code"
                aria-label="Edit code"
                @click="startEdit('sql')"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16v4z" stroke-linejoin="round" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
              </button>
            </div>
            <template v-if="editing === 'sql'">
              <textarea
                v-model="draft"
                data-edit="sql"
                rows="10"
                spellcheck="false"
                aria-label="Code"
                class="mt-1.5 w-full resize-y rounded-lg border border-[#3B1770] bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-[#25262E] outline-none"
                @keydown.esc.prevent="cancelEdit"
              ></textarea>
              <div class="mt-2 flex gap-2">
                <button type="button" class="rounded bg-[#3B1770] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#4B1E8C]" @click="saveEdit">Save</button>
                <button type="button" class="rounded px-2 py-1 text-[12px] font-medium text-[#6B6B6B] hover:bg-[#F7F7F8]" @click="cancelEdit">Cancel</button>
              </div>
            </template>
            <pre
              v-else
              class="mt-1.5 overflow-x-auto rounded-lg border border-[#E2E2E2] bg-[#F8F8FA] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#3B1770]"
            >{{ question.sql }}</pre>
          </div>
        </section>

        <!-- Notes -->
        <section v-else>
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">Notes</p>
            <button
              v-if="editing !== 'comment'"
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-md text-[#9A9A9A] transition-colors hover:bg-[#F1F1F1] hover:text-[#3B1770]"
              title="Edit notes"
              aria-label="Edit notes"
              @click="startEdit('comment')"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M4 20h4L19 9l-4-4L4 16v4z" stroke-linejoin="round" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
          </div>
          <template v-if="editing === 'comment'">
            <textarea
              v-model="draft"
              data-edit="comment"
              rows="4"
              aria-label="Notes"
              placeholder="Caveats, definitions, or why this code is the right one…"
              class="mt-1.5 w-full resize-y rounded-lg border border-[#3B1770] bg-white px-4 py-3 text-sm leading-relaxed text-[#25262E] outline-none placeholder:text-[#9A9A9A]"
              @keydown.esc.prevent="cancelEdit"
            ></textarea>
            <div class="mt-2 flex gap-2">
              <button type="button" class="rounded bg-[#3B1770] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#4B1E8C]" @click="saveEdit">Save</button>
              <button type="button" class="rounded px-2 py-1 text-[12px] font-medium text-[#6B6B6B] hover:bg-[#F7F7F8]" @click="cancelEdit">Cancel</button>
            </div>
          </template>
          <p v-else-if="question.comment" class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#25262E]">
            {{ question.comment }}
          </p>
          <p v-else class="mt-1.5 text-sm text-[#9A9A9A]">No notes yet.</p>
        </section>
      </div>

      <!-- Footer -->
      <footer class="mx-5 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-[#EAEAEA] py-3 text-xs text-[#9A9A9A]">
        <span>
          Created by <span class="font-medium text-[#25262E]">{{ question.createdBy }}</span>
          · {{ formatAssetModifiedAt(question.createdAt) }}
        </span>
        <span v-if="question.updatedAt">
          Last updated <span class="font-medium text-[#25262E]">{{ formatAssetModifiedAt(question.updatedAt) }}</span>
          <template v-if="showEditedBy"> by <span class="font-medium text-[#25262E]">{{ question.updatedBy }}</span></template>
        </span>
        <span class="ml-auto flex items-center gap-2">
          <template v-if="confirmingRemove">
            <span class="text-[#6B6B6B]">Remove certification?</span>
            <button type="button" class="rounded px-2 py-0.5 font-medium text-[#B42318] hover:bg-[#FEF3F2]" @click="removeQuestion(question.id)">
              Remove
            </button>
            <button type="button" class="rounded px-2 py-0.5 font-medium text-[#6B6B6B] hover:bg-[#F7F7F8]" @click="confirmingRemove = false">
              Cancel
            </button>
          </template>
          <button
            v-else
            type="button"
            class="rounded px-2 py-0.5 font-medium text-[#6B6B6B] hover:bg-[#F7F7F8] hover:text-[#B42318]"
            @click="confirmingRemove = true"
          >
            Remove
          </button>
        </span>
      </footer>
    </template>
  </article>
</template>
