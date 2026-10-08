<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { REFINE_REASONS, type RefineReason, type RefineRequest } from '~/composables/agentDataAnswers';

/** Refine panel, docked above the composer: context on what missed so the agent re-runs the answer. */
withDefaults(
  defineProps<{
    cardId: string;
    /** The question behind the answer being refined, quoted for context. */
    question?: string;
    /** False on replies that aren't data answers: there's no query to re-run. */
    hasQuery?: boolean;
  }>(),
  { question: '', hasQuery: true },
);

const emit = defineEmits<{
  refine: [request: RefineRequest];
  dismiss: [];
}>();

const reason = ref<RefineReason | null>(null);
const note = ref('');
const noteField = ref<HTMLTextAreaElement | null>(null);

onMounted(() => noteField.value?.focus());

const canRefine = computed(() => reason.value !== null || note.value.trim().length > 0);

function pick(id: RefineReason): void {
  reason.value = reason.value === id ? null : id;
}

function onRefine(): void {
  if (!canRefine.value) return;
  emit('refine', { reason: reason.value ?? 'other', note: note.value.trim() });
}
</script>

<template>
  <section
    :aria-labelledby="`refine-title-${cardId}`"
    class="relative w-full rounded-2xl border border-[#E2E2E2] bg-white p-4 shadow-[0_-4px_16px_rgba(37,38,46,0.06)]"
    @keydown.esc="emit('dismiss')"
  >
    <h2 :id="`refine-title-${cardId}`" class="text-base font-semibold text-[#25262E]">Refine this answer</h2>
    <p v-if="question" class="mt-0.5 truncate text-xs text-[#9A9A9A]" :title="question">“{{ question }}”</p>
    <p class="mt-1 text-sm text-[#6B6B6B]">
      {{ hasQuery ? "Tell me what missed and I'll re-run the query." : "Tell me what missed and I'll take it into account." }}
    </p>

    <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="What was off">
      <button
        v-for="option in REFINE_REASONS"
        :key="option.id"
        type="button"
        class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        :class="
          reason === option.id
            ? 'border-[#3B1770] bg-[#F5F1FC] text-[#3B1770]'
            : 'border-[#E2E2E2] text-[#6B6B6B] hover:border-[#3B1770] hover:text-[#3B1770]'
        "
        :aria-pressed="reason === option.id"
        @click="pick(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

    <label :for="`refine-note-${cardId}`" class="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[#6B6B6B]">
      Add context
      <span class="ml-1 font-normal normal-case tracking-normal text-[#9A9A9A]">(optional if you pick a reason)</span>
    </label>
    <textarea
      :id="`refine-note-${cardId}`"
      ref="noteField"
      v-model="note"
      rows="2"
      placeholder="e.g. exclude refunded orders"
      class="mt-1.5 w-full resize-y rounded-lg border border-[#E2E2E2] bg-white px-3 py-2 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
      @keydown.enter.exact.prevent="onRefine"
    ></textarea>

    <div class="mt-3 flex items-center gap-3">
      <button
        type="button"
        class="h-9 rounded-xl bg-[#3B1770] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4B1E8C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!canRefine"
        @click="onRefine"
      >
        Refine
      </button>
      <button
        type="button"
        class="h-9 rounded-xl px-3 text-sm font-medium text-[#6B6B6B] transition-colors hover:bg-[#F7F7F8] hover:text-[#25262E]"
        @click="emit('dismiss')"
      >
        Cancel
      </button>
    </div>
  </section>
</template>
