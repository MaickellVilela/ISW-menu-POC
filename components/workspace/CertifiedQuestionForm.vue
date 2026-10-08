<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  MAX_PHRASINGS,
  normalizeQuestion,
  useCertifiedQuestions,
} from '~/composables/useCertifiedQuestions';

type Step = 1 | 2 | 3;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Question & Phrasings' },
  { id: 2, label: 'Code & Summary' },
  { id: 3, label: 'Notes' },
];

const QUERY_PLACEHOLDER = 'SELECT ...\nFROM ...\nWHERE ...';

/** Creates a certified question by hand, in three steps, without going through the agent. */
const props = defineProps<{
  sourceId: string;
}>();

const emit = defineEmits<{
  created: [questionId: string];
  cancel: [];
}>();

const { questionsFor, certify } = useCertifiedQuestions();

const root = ref<HTMLElement | null>(null);
const step = ref<Step>(1);
const question = ref('');
const phrasings = ref<string[]>(['']);
const summary = ref('');
const sql = ref('');
const comment = ref('');

const isDuplicate = computed(() => {
  const key = normalizeQuestion(question.value);
  return Boolean(key) && questionsFor(props.sourceId).some((item) => normalizeQuestion(item.question) === key);
});

/** The question is required (and new); a certified question is useless without its query. */
function isStepComplete(id: Step): boolean {
  if (id === 1) return question.value.trim().length > 0 && !isDuplicate.value;
  if (id === 2) return sql.value.trim().length > 0;
  return true;
}

/** Earlier steps are always reachable; later ones once every step before them is complete. */
function canVisit(id: Step): boolean {
  for (let earlier = 1; earlier < id; earlier += 1) {
    if (!isStepComplete(earlier as Step)) return false;
  }
  return true;
}

const canAdvance = computed(() => isStepComplete(step.value));
const canSubmit = computed(() => isStepComplete(1) && isStepComplete(2));

async function focusStep(): Promise<void> {
  await nextTick();
  root.value?.querySelector<HTMLElement>('[data-step-focus]')?.focus();
}

onMounted(focusStep);
watch(step, focusStep);

function goTo(id: Step): void {
  if (id !== step.value && canVisit(id)) step.value = id;
}

function next(): void {
  if (step.value < 3 && canAdvance.value) step.value = (step.value + 1) as Step;
}

function back(): void {
  if (step.value > 1) step.value = (step.value - 1) as Step;
}

async function addPhrasingRow(): Promise<void> {
  if (phrasings.value.length >= MAX_PHRASINGS) return;
  phrasings.value = [...phrasings.value, ''];
  await nextTick();
  const inputs = root.value?.querySelectorAll<HTMLInputElement>('[data-phrasing]');
  inputs?.[inputs.length - 1]?.focus();
}

function removePhrasingRow(index: number): void {
  const rest = phrasings.value.filter((_, position) => position !== index);
  phrasings.value = rest.length ? rest : [''];
}

/** Drops blanks and repeats, including a phrasing that only restates the question. */
function cleanedPhrasings(): string[] {
  const taken = new Set([normalizeQuestion(question.value)]);
  const result: string[] = [];
  for (const phrase of phrasings.value) {
    const text = phrase.trim();
    const key = normalizeQuestion(text);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    result.push(text);
  }
  return result.slice(0, MAX_PHRASINGS);
}

function submit(): void {
  if (!canSubmit.value) return;
  const created = certify({
    sourceId: props.sourceId,
    question: question.value,
    phrasings: cleanedPhrasings(),
    summary: summary.value.trim(),
    sql: sql.value.trimEnd(),
    comment: comment.value,
  });
  emit('created', created.id);
}
</script>

<template>
  <section
    ref="root"
    aria-label="New certified question"
    class="overflow-hidden rounded-xl border border-[#8B6FC6] bg-[#F8F6FC]"
  >
    <!-- Steps -->
    <ol class="grid grid-cols-3 border-b border-[#E4DAF5] bg-white">
      <li v-for="item in STEPS" :key="item.id">
        <button
          type="button"
          class="flex w-full items-center gap-2.5 border-b-2 px-5 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default"
          :class="
            item.id === step
              ? 'border-[#3B1770] text-[#3B1770]'
              : item.id < step
                ? 'border-transparent text-[#6B6B6B] hover:text-[#3B1770]'
                : 'border-transparent text-[#B4B4BC]'
          "
          :aria-current="item.id === step ? 'step' : undefined"
          :disabled="item.id === step || !canVisit(item.id)"
          @click="goTo(item.id)"
        >
          <span
            class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            :class="
              item.id === step
                ? 'bg-[#3B1770] text-white'
                : item.id < step
                  ? 'bg-[#CFC2EE] text-white'
                  : 'bg-[#EDEDF0] text-[#9A9A9A]'
            "
          >
            <svg v-if="item.id < step" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <template v-else>{{ item.id }}</template>
          </span>
          <span class="truncate">{{ item.label }}</span>
        </button>
      </li>
    </ol>

    <div class="px-5 pb-5 pt-4">
      <!-- 1. Question & phrasings -->
      <template v-if="step === 1">
        <label for="cq-new-question" class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">
          Certified question
        </label>
        <textarea
          id="cq-new-question"
          v-model="question"
          data-step-focus
          rows="2"
          placeholder="e.g. What are the top customers by order value?"
          class="mt-1.5 w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
          :class="isDuplicate ? 'border-[#F04438]' : 'border-[#E2E2E2]'"
          :aria-invalid="isDuplicate"
          @keydown.enter.prevent="next"
        ></textarea>
        <p v-if="isDuplicate" class="mt-1 text-xs text-[#B42318]">This question is already certified for this source.</p>

        <p class="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">
          Associated phrasings
          <span class="ml-1 font-normal tracking-normal">({{ phrasings.length }}/{{ MAX_PHRASINGS }})</span>
        </p>
        <ul class="mt-2 space-y-2">
          <li v-for="(_, index) in phrasings" :key="index" class="flex items-center gap-3">
            <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#A78BDA]" aria-hidden="true" />
            <input
              v-model="phrasings[index]"
              data-phrasing
              type="text"
              placeholder="Alternative phrasing…"
              :aria-label="`Phrasing ${index + 1}`"
              class="h-10 min-w-0 flex-1 rounded-lg border border-[#E2E2E2] bg-white px-3 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
              @keydown.enter.prevent="addPhrasingRow"
            />
            <button
              v-if="phrasings.length > 1 || phrasings[index]"
              type="button"
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[#9A9A9A] transition-colors hover:bg-[#F1ECFA] hover:text-[#3B1770]"
              :aria-label="`Remove phrasing ${index + 1}`"
              @click="removePhrasingRow(index)"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
              </svg>
            </button>
          </li>
        </ul>
        <button
          v-if="phrasings.length < MAX_PHRASINGS"
          type="button"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#3B1770] hover:underline"
          @click="addPhrasingRow"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Add phrasing
        </button>
      </template>

      <!-- 2. Code & summary -->
      <template v-else-if="step === 2">
        <label for="cq-new-summary" class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">
          Summary
        </label>
        <textarea
          id="cq-new-summary"
          v-model="summary"
          data-step-focus
          rows="3"
          placeholder="Short description of what this code returns…"
          class="mt-1.5 w-full resize-y rounded-lg border border-[#E2E2E2] bg-white px-3 py-2.5 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
        ></textarea>

        <label for="cq-new-query" class="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">
          Code
        </label>
        <textarea
          id="cq-new-query"
          v-model="sql"
          rows="6"
          spellcheck="false"
          :placeholder="QUERY_PLACEHOLDER"
          class="mt-1.5 w-full resize-y rounded-lg border border-[#E2E2E2] bg-white px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
        ></textarea>
        <p class="mt-1 text-xs text-[#9A9A9A]">
          The agent runs this code whenever someone asks the question or one of its phrasings.
        </p>
      </template>

      <!-- 3. Notes -->
      <template v-else>
        <label for="cq-new-notes" class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A9A9A]">
          Notes
        </label>
        <textarea
          id="cq-new-notes"
          v-model="comment"
          data-step-focus
          rows="5"
          placeholder="Why was this question certified? Any context, decisions, or caveats others should know…"
          class="mt-1.5 w-full resize-y rounded-lg border border-[#E2E2E2] bg-white px-3 py-2.5 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
        ></textarea>
      </template>

      <div class="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          class="h-9 rounded-lg border border-[#E2E2E2] bg-white px-4 text-sm font-medium text-[#25262E] transition-colors hover:bg-[#F7F7F8]"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          v-if="step > 1"
          type="button"
          class="h-9 rounded-lg border border-[#E2E2E2] bg-white px-4 text-sm font-medium text-[#25262E] transition-colors hover:bg-[#F7F7F8]"
          @click="back"
        >
          Back
        </button>
        <button
          v-if="step < 3"
          type="button"
          class="h-9 rounded-lg bg-[#3B1770] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#E5E5EA] disabled:text-[#9A9A9A]"
          :disabled="!canAdvance"
          :title="!canAdvance && step === 2 ? 'Add the code to continue' : undefined"
          @click="next"
        >
          Next
        </button>
        <button
          v-else
          type="button"
          class="h-9 rounded-lg bg-[#3B1770] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#E5E5EA] disabled:text-[#9A9A9A]"
          :disabled="!canSubmit"
          @click="submit"
        >
          Add question
        </button>
      </div>
    </div>
  </section>
</template>
