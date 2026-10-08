<script setup lang="ts">
import { computed, ref } from 'vue';
import { REFINE_REASONS, type RefineReason, type RefineRequest } from '~/composables/agentDataAnswers';

/** Thumbs-down follow-up: says what missed so the agent can re-run the answer. */
withDefaults(
  defineProps<{
    cardId: string;
    /** False on replies that aren't data answers: there's no query to re-run. */
    hasQuery?: boolean;
  }>(),
  { hasQuery: true },
);

const emit = defineEmits<{
  refine: [request: RefineRequest];
  dismiss: [];
}>();

const reason = ref<RefineReason | null>(null);
const note = ref('');

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
    class="relative mt-3 w-full rounded-2xl border border-[#E2E2E2] bg-white p-5 shadow-sm"
  >
    <span
      class="absolute -top-1.5 left-[4.25rem] h-3 w-3 rotate-45 rounded-tl-[2px] border-l border-t border-[#E2E2E2] bg-white"
      aria-hidden="true"
    />

    <h2 :id="`refine-title-${cardId}`" class="text-base font-semibold text-[#25262E]">What was off?</h2>
    <p class="mt-0.5 text-sm text-[#6B6B6B]">
      {{ hasQuery ? "Tell me what missed and I'll re-run the query." : "Tell me what missed and I'll take it into account." }}
    </p>

    <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="What was off">
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

    <label :for="`refine-note-${cardId}`" class="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-[#6B6B6B]">
      Tell me more
      <span class="ml-1 font-normal normal-case tracking-normal text-[#9A9A9A]">(optional)</span>
    </label>
    <textarea
      :id="`refine-note-${cardId}`"
      v-model="note"
      rows="2"
      placeholder="e.g. exclude refunded orders"
      class="mt-1.5 w-full resize-y rounded-lg border border-[#E2E2E2] bg-white px-3 py-2 text-sm text-[#25262E] outline-none placeholder:text-[#9A9A9A] focus:border-[#3B1770]"
      @keydown.enter.exact.prevent="onRefine"
    ></textarea>

    <div class="mt-4 flex items-center gap-3">
      <button
        type="button"
        class="h-10 rounded-xl bg-[#3B1770] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4B1E8C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!canRefine"
        @click="onRefine"
      >
        Refine answer
      </button>
      <button
        type="button"
        class="h-10 rounded-xl px-3 text-sm font-medium text-[#6B6B6B] transition-colors hover:bg-[#F7F7F8] hover:text-[#25262E]"
        @click="emit('dismiss')"
      >
        Skip
      </button>
    </div>
  </section>
</template>
