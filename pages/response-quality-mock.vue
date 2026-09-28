<script setup lang="ts">
type Rating = 'up' | 'down';

type TranscriptMessage = {
  id: string;
  role: 'assistant' | 'user';
  lead: string;
  bullets?: string[];
  trail?: string;
  rating?: Rating;
};

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `msg-${sequence}`;
}

function lastMessage(messages: TranscriptMessage[]): TranscriptMessage | undefined {
  return messages[messages.length - 1];
}

/** The latest assistant reply blocks the next prompt until it is rated. */
function needsQualityRating(messages: TranscriptMessage[]): boolean {
  const latest = lastMessage(messages);
  return latest?.role === 'assistant' && latest.rating === undefined;
}

function applyRating(messages: TranscriptMessage[], rating: Rating): TranscriptMessage[] {
  const latest = lastMessage(messages);
  if (!latest || latest.role !== 'assistant' || latest.rating) return messages;
  return messages.map((message) =>
    message.id === latest.id ? { ...message, rating } : message,
  );
}

function ratingCaption(rating: Rating): string {
  return rating === 'up' ? 'Marked helpful' : 'Marked not helpful';
}

function userMessage(text: string): TranscriptMessage {
  return { id: nextId(), role: 'user', lead: text };
}

function followUpReply(): TranscriptMessage {
  return {
    id: nextId(),
    role: 'assistant',
    lead: 'As a share of the $135.00K total for campaigns ending in 2026:',
    bullets: ['Enterprise: 59%', 'SMB: 33%', 'Consumer: 7%'],
    trail: 'Enterprise still accounts for most of the allocation.',
  };
}

const messages = ref<TranscriptMessage[]>([
  {
    id: nextId(),
    role: 'assistant',
    lead: "Your data source is ready. I've connected public.marketing_campaigns and public.orders via the Marketing data connection. You can now query across both tables.",
  },
  {
    id: nextId(),
    role: 'user',
    lead: 'How is budget distributed by target segment for campaigns ending in 2026?',
  },
  {
    id: nextId(),
    role: 'assistant',
    lead: 'For campaigns ending in 2026, budget is distributed like this:',
    bullets: ['Enterprise: $80.00K', 'SMB: $45.00K', 'Consumer: $10.00K'],
    trail: 'Enterprise has the largest budget allocation.',
  },
]);

const draft = ref('');
const scrollArea = ref<HTMLElement | null>(null);
const composer = ref<HTMLTextAreaElement | null>(null);

const ratingRequired = computed(() => needsQualityRating(messages.value));
const canSend = computed(() => !ratingRequired.value && draft.value.trim().length > 0);
const composerPlaceholder = computed(() =>
  ratingRequired.value ? 'Rate this response to continue' : 'Ask anything…',
);

function scrollToBottom(): void {
  const el = scrollArea.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function rate(rating: Rating): Promise<void> {
  if (!ratingRequired.value) return;
  messages.value = applyRating(messages.value, rating);
  await nextTick();
  composer.value?.focus();
}

async function onSend(): Promise<void> {
  if (!canSend.value) return;
  const text = draft.value.trim();
  draft.value = '';
  messages.value = [...messages.value, userMessage(text), followUpReply()];
  await nextTick();
  scrollToBottom();
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <div ref="scrollArea" class="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-6">
      <div class="mt-auto space-y-4">
      <template v-for="message in messages" :key="message.id">
        <div v-if="message.role === 'assistant'" class="flex justify-start">
          <div class="max-w-[85%]">
            <div class="rounded-2xl rounded-bl-sm bg-[#F5F1FC] px-3.5 py-2 text-sm leading-relaxed text-[#25262E]">
              <p>{{ message.lead }}</p>
              <ul v-if="message.bullets?.length" class="mt-2 list-disc space-y-0.5 pl-5">
                <li v-for="bullet in message.bullets" :key="bullet">{{ bullet }}</li>
              </ul>
              <p v-if="message.trail" class="mt-2">{{ message.trail }}</p>
            </div>
            <p
              v-if="message.rating"
              class="mt-1.5 flex items-center gap-1.5 text-xs text-[#6B6B6B]"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
                :class="message.rating === 'down' ? 'rotate-180' : ''"
              >
                <path
                  d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.2-7.2A1.6 1.6 0 0 1 14.6 4v4h5.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18.6 19H7"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
              {{ ratingCaption(message.rating) }}
            </p>
          </div>
        </div>

        <div v-else class="flex justify-end">
          <div class="max-w-[85%] rounded-2xl rounded-br-sm bg-[#3B1770] px-3.5 py-2 text-sm leading-relaxed text-white">
            {{ message.lead }}
          </div>
        </div>
      </template>
      </div>
    </div>

    <div class="mx-auto w-full max-w-3xl flex-shrink-0 px-4 pb-4">
      <section
        v-if="ratingRequired"
        aria-labelledby="quality-prompt-title"
        class="mb-3 rounded-xl border border-[#C9B8E8] bg-[#F8F6FC] px-4 py-3.5"
      >
        <p class="text-[11px] font-medium uppercase tracking-wide text-[#6F42A5]">Before you continue</p>
        <h2 id="quality-prompt-title" class="mt-1 text-sm font-semibold text-[#25262E]">
          Was this response helpful?
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-[#6B6B6B]">
          Choose one to ask a follow-up. Your rating helps shape the next answer.
        </p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E2E2E2] bg-white text-sm font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC]"
            @click="rate('up')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path
                d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.2-7.2A1.6 1.6 0 0 1 14.6 4v4h5.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18.6 19H7"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
            Helpful
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E2E2E2] bg-white text-sm font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC]"
            @click="rate('down')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 rotate-180" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path
                d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.2-7.2A1.6 1.6 0 0 1 14.6 4v4h5.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18.6 19H7"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
            Not helpful
          </button>
        </div>
      </section>
      <div
        class="flex items-center gap-2 rounded-full border-2 bg-white py-1.5 pl-5 pr-1.5 transition-colors"
        :class="ratingRequired ? 'border-[#E2E2E2]' : 'border-[#C9B8E8] focus-within:border-[#8B5CF6]'"
      >
        <textarea
          ref="composer"
          v-model="draft"
          rows="1"
          :placeholder="composerPlaceholder"
          :disabled="ratingRequired"
          class="max-h-28 flex-1 resize-none self-center bg-transparent py-2 text-sm leading-5 text-[#25262E] placeholder:text-[#9A9A9A] focus:outline-none disabled:cursor-not-allowed"
          @keydown.enter.exact.prevent="onSend"
        ></textarea>
        <button
          type="button"
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#6B3FA0] text-white transition-colors hover:bg-[#5A3389] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canSend"
          title="Send"
          aria-label="Send"
          @click="onSend"
        >
          <svg viewBox="0 0 16 16" class="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M1.29754 6.21029C0.949182 6.09417 0.946429 5.90681 1.30471 5.78739L14.0288 1.54601C14.3812 1.42857 14.5832 1.62577 14.4845 1.97129L10.849 14.6955C10.7484 15.0477 10.5453 15.06 10.3964 14.7251L8.00009 9.33333L12.0001 4.00004L6.66678 8L1.29754 6.21029Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
