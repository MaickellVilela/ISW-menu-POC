<script setup lang="ts">
import { computed } from 'vue';
import CertifiedQuestionItem from '~/components/workspace/CertifiedQuestionItem.vue';
import { useCertifiedQuestions } from '~/composables/useCertifiedQuestions';

/** The open source's certified questions, managed in the workspace's configuration. */
const props = withDefaults(
  defineProps<{
    sourceId: string;
    sourceName: string;
    highlightId?: string | null;
    /** False while editing the source: the agent is hidden until the edit ends. */
    canAdd?: boolean;
  }>(),
  { highlightId: null, canAdd: true },
);

const emit = defineEmits<{
  /** New questions are certified from the chat, so the host focuses the agent. */
  addQuestion: [];
}>();

const { questionsFor } = useCertifiedQuestions();

const questions = computed(() => questionsFor(props.sourceId));
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-white">
    <div class="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[#E2E2E2] px-6 py-4">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold text-[#25262E]">Certified questions</h2>
        <p class="mt-0.5 truncate text-xs text-[#9A9A9A]">
          Verified questions for {{ sourceName }}. Anyone asking one gets its saved query.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-[#3B1770] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#3B1770]"
        :disabled="!canAdd"
        :title="
          canAdd
            ? 'Ask the agent a question, then give the answer a thumbs up to certify it'
            : 'Finish editing the source to ask the agent'
        "
        @click="emit('addQuestion')"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Add question
      </button>
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FAFAFB] px-6 py-5">
      <CertifiedQuestionItem
        v-for="question in questions"
        :key="question.id"
        :question="question"
        :highlighted="question.id === highlightId"
      />

      <div
        v-if="!questions.length"
        class="mx-auto mt-10 flex max-w-sm flex-col items-center text-center"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1ECFA] text-[#3B1770]" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke-linejoin="round" />
            <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <p class="mt-3 text-sm font-semibold text-[#25262E]">No certified questions yet</p>
        <p class="mt-1 text-sm text-[#6B6B6B]">
          Ask the agent a question about this source, then give the answer a thumbs up to certify it.
        </p>
      </div>
    </div>
  </div>
</template>
