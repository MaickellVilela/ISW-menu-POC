<script setup lang="ts">
import { computed } from 'vue';
import CertifiedQuestionItem from '~/components/workspace/CertifiedQuestionItem.vue';
import { useCertifiedQuestions } from '~/composables/useCertifiedQuestions';

/**
 * The open source's certified questions, managed in its Certified Questions tab.
 * Questions are only added by certifying an agent answer; there's no create form here.
 */
const props = withDefaults(
  defineProps<{
    sourceId: string;
    sourceName: string;
    /** Set by the host, e.g. when a matched question in the chat is clicked. */
    highlightId?: string | null;
  }>(),
  { highlightId: null },
);

const { questionsFor } = useCertifiedQuestions();

const questions = computed(() => questionsFor(props.sourceId));
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-white">
    <div class="flex-shrink-0 border-b border-[#E2E2E2] px-6 py-4">
      <h2 class="text-lg font-semibold text-[#25262E]">Certified questions</h2>
      <p class="mt-0.5 truncate text-xs text-[#9A9A9A]">
        Verified questions for {{ sourceName }}. Anyone asking one gets its saved answer.
      </p>
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FAFAFB] px-6 py-5">
      <!-- How questions get here and what stays locked, once there's a list to read it against -->
      <p
        v-if="questions.length"
        class="flex items-start gap-2.5 rounded-lg border border-[#E4DAF5] bg-[#F8F6FC] px-4 py-3 text-xs leading-relaxed text-[#6B6B6B]"
      >
        <svg viewBox="0 0 24 24" class="mt-px h-4 w-4 flex-shrink-0 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" stroke-linecap="round" />
        </svg>
        <span>
          Questions are added from the agent: select <span class="font-medium text-[#3B1770]">Certify</span> under an
          answer. Here you can edit a question, its phrasings and notes. Its summary and code stay exactly as certified.
        </span>
      </p>

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
          Ask the agent about {{ sourceName }}, then select
          <span class="font-medium text-[#3B1770]">Certify</span> under its answer to add it here.
        </p>
      </div>
    </div>
  </div>
</template>
