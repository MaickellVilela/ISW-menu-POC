<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  MAX_PHRASINGS,
  buildPhrasingSuggestions,
  normalizeQuestion,
  type CertifyPayload,
} from '~/composables/useCertifiedQuestions';

interface PhrasingOption {
  text: string;
  custom: boolean;
}

/**
 * Thumbs-up follow-up: certifies the answered question, or, when it's already
 * certified, updates that question's phrasings and notes. On a reply that isn't
 * an answer, the author types the question instead.
 */
const props = withDefaults(
  defineProps<{
    cardId: string;
    question: string;
    sourceName: string;
    /** Agent-suggested phrasings; read once when the card opens. */
    suggestions?: string[];
    /** Set when the question is already certified: its author, phrasings and notes. */
    certifiedBy?: string | null;
    initialPhrasings?: string[];
    initialComment?: string;
    /** The reply answered no question, so the author writes one; suggestions follow it. */
    questionEditable?: boolean;
    /** Why certifying can't happen yet, e.g. there's no data source. */
    blockedReason?: string | null;
  }>(),
  {
    suggestions: () => [],
    certifiedBy: null,
    initialPhrasings: () => [],
    initialComment: '',
    questionEditable: false,
    blockedReason: null,
  },
);

const emit = defineEmits<{
  save: [payload: CertifyPayload];
  dismiss: [];
}>();

const isUpdate = computed(() => props.certifiedBy !== null);

const questionDraft = ref(props.question);
const selected = ref<string[]>([...props.initialPhrasings]);
const customs = ref<string[]>([]);
const customDraft = ref('');
const comment = ref(props.initialComment);

const currentQuestion = computed(() =>
  props.questionEditable ? questionDraft.value.trim() : props.question,
);

const suggestionPool = computed(() => {
  if (!props.questionEditable) return props.suggestions;
  return currentQuestion.value ? buildPhrasingSuggestions(currentQuestion.value) : [];
});

// Current phrasings first, then suggestions, then picks a retyped question no longer suggests, then the author's own.
const options = computed<PhrasingOption[]>(() => {
  const seen = new Set<string>([normalizeQuestion(currentQuestion.value)]);
  const list: PhrasingOption[] = [];
  function push(text: string, custom: boolean): void {
    const key = normalizeQuestion(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push({ text, custom });
  }
  props.initialPhrasings.forEach((text) => push(text, false));
  suggestionPool.value.forEach((text) => push(text, false));
  selected.value.filter((text) => !customs.value.includes(text)).forEach((text) => push(text, false));
  customs.value.forEach((text) => push(text, true));
  return list;
});

const atLimit = computed(() => selected.value.length >= MAX_PHRASINGS);
const canAddCustom = computed(() => !atLimit.value && customDraft.value.trim().length > 0);
const canSave = computed(() => !props.blockedReason && currentQuestion.value.length > 0);

function isSelected(text: string): boolean {
  return selected.value.includes(text);
}

function toggle(text: string): void {
  if (isSelected(text)) {
    selected.value = selected.value.filter((item) => item !== text);
  } else if (!atLimit.value) {
    selected.value = [...selected.value, text];
  }
}

function addCustom(): void {
  const text = customDraft.value.trim();
  if (!text || atLimit.value) return;
  const key = normalizeQuestion(text);
  if (key === normalizeQuestion(currentQuestion.value)) {
    customDraft.value = '';
    return;
  }
  const existing = options.value.find((option) => normalizeQuestion(option.text) === key);
  if (existing) {
    if (!isSelected(existing.text)) selected.value = [...selected.value, existing.text];
  } else {
    customs.value = [...customs.value, text];
    selected.value = [...selected.value, text];
  }
  customDraft.value = '';
}

function removeCustom(text: string): void {
  customs.value = customs.value.filter((item) => item !== text);
  selected.value = selected.value.filter((item) => item !== text);
}

const associatedLabel = computed(() => {
  const count = selected.value.length;
  const noun = count === 1 ? 'phrasing' : 'phrasings';
  return atLimit.value ? `${count} ${noun} associated · maximum reached` : `${count} ${noun} associated`;
});

function onSave(): void {
  if (!canSave.value) return;
  const phrasings = options.value.map((option) => option.text).filter(isSelected);
  emit('save', { question: currentQuestion.value, phrasings, comment: comment.value.trim() });
}
</script>

<template>
  <section
    :aria-labelledby="`certify-title-${cardId}`"
    class="mt-3 w-full overflow-hidden rounded-2xl border border-[#D4C4EF] bg-[#F8F6FC]"
  >
    <header class="flex items-start gap-3 border-b border-[#E4DAF5] px-5 py-4">
      <svg viewBox="0 0 24 24" class="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke-linejoin="round" />
        <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div class="min-w-0">
        <h2 :id="`certify-title-${cardId}`" class="text-[15px] font-semibold text-[#3B1770]">
          {{ isUpdate ? 'Question certified' : questionEditable ? 'Certify a question' : 'Certify this question' }}
        </h2>
        <template v-if="questionEditable">
          <p class="mt-1 text-xs leading-relaxed text-[#6B6B6B]">
            {{
              blockedReason ??
              `Which question should this certify? I'll write its query from ${sourceName} when you certify it.`
            }}
          </p>
        </template>
        <p v-else class="mt-1 text-sm font-medium text-[#25262E]">“{{ question }}”</p>
        <p v-if="isUpdate" class="mt-1 text-xs leading-relaxed text-[#6B6B6B]">
          Certified by {{ certifiedBy }}. Update the phrasings and notes associated with it.
        </p>
        <p v-else-if="!questionEditable" class="mt-1 text-xs leading-relaxed text-[#6B6B6B]">
          Select phrasings to associate with it. Anyone asking any of them about {{ sourceName }} gets this query.
        </p>
      </div>
    </header>

    <div class="px-5 pb-4 pt-3">
      <template v-if="questionEditable">
        <label
          :for="`certify-question-${cardId}`"
          class="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B6FC6]"
        >
          Question
        </label>
        <input
          :id="`certify-question-${cardId}`"
          v-model="questionDraft"
          type="text"
          placeholder="e.g. What are the key metrics in order_items?"
          :disabled="Boolean(blockedReason)"
          class="mb-3 mt-1.5 h-10 w-full rounded-xl border border-[#E2E2E2] bg-white px-3 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770] disabled:cursor-not-allowed disabled:bg-[#F7F7F8]"
        />
      </template>
      <fieldset>
        <legend class="sr-only">Associated phrasings</legend>
        <ul class="space-y-0.5">
          <li v-for="option in options" :key="option.text">
            <label
              class="flex items-start gap-3 rounded-lg px-1.5 py-1.5 text-sm text-[#25262E] transition-colors"
              :class="
                !isSelected(option.text) && atLimit
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:bg-white'
              "
            >
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded-sm disabled:cursor-not-allowed"
                style="accent-color: #3b1770"
                :checked="isSelected(option.text)"
                :disabled="!isSelected(option.text) && atLimit"
                @change="toggle(option.text)"
              />
              <span class="min-w-0 flex-1">{{ option.text }}</span>
              <button
                v-if="option.custom"
                type="button"
                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#9A9A9A] transition-colors hover:bg-[#F1ECFA] hover:text-[#3B1770]"
                :aria-label="`Remove ${option.text}`"
                @click.prevent="removeCustom(option.text)"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
                </svg>
              </button>
            </label>
          </li>
        </ul>

        <div class="mt-3 flex items-center gap-2">
          <label class="sr-only" :for="`certify-custom-${cardId}`">Add your own phrasing</label>
          <input
            :id="`certify-custom-${cardId}`"
            v-model="customDraft"
            type="text"
            :placeholder="atLimit ? `You've picked ${MAX_PHRASINGS} phrasings` : 'Add your own phrasing…'"
            :disabled="atLimit"
            class="h-10 min-w-0 flex-1 rounded-xl border border-[#E2E2E2] bg-white px-3 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770] disabled:cursor-not-allowed disabled:bg-[#F7F7F8]"
            @keydown.enter.prevent="addCustom"
          />
          <button
            type="button"
            class="h-10 flex-shrink-0 rounded-xl bg-[#E9E3F7] px-4 text-sm font-medium text-[#3B1770] transition-colors hover:bg-[#DDD3F2] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#E9E3F7]"
            :disabled="!canAddCustom"
            @click="addCustom"
          >
            Add
          </button>
        </div>
      </fieldset>

      <label
        :for="`certify-note-${cardId}`"
        class="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B6FC6]"
      >
        Supporting notes
      </label>
      <textarea
        :id="`certify-note-${cardId}`"
        v-model="comment"
        rows="3"
        placeholder="Add context, rationale, or caveats…"
        class="mt-1.5 w-full resize-y rounded-xl border border-[#E2E2E2] bg-white px-3 py-2 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
      ></textarea>
    </div>

    <footer class="flex items-center justify-between gap-3 border-t border-[#E4DAF5] px-5 py-3">
      <p class="text-xs text-[#9A9A9A]" aria-live="polite">{{ associatedLabel }}</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-9 rounded-xl px-3 text-sm font-medium text-[#6B6B6B] transition-colors hover:bg-white hover:text-[#25262E]"
          @click="emit('dismiss')"
        >
          Not now
        </button>
        <button
          type="button"
          class="h-9 rounded-xl bg-[#3B1770] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4B1E8C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!canSave"
          @click="onSave"
        >
          {{ isUpdate ? 'Save' : 'Certify question' }}
        </button>
      </div>
    </footer>
  </section>
</template>
