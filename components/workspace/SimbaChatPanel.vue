<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { useDataSourceFlow } from '~/composables/useDataSourceFlow';
import UseCaseStep from '~/components/workspace/steps/UseCaseStep.vue';
import ConnectionStep from '~/components/workspace/steps/ConnectionStep.vue';
import TableConfigStep from '~/components/workspace/steps/TableConfigStep.vue';

const {
  items,
  activeStep,
  isCreating,
  isComplete,
  suggestedQuestions,
  hasFreeText,
  connections,
  schemas,
  tables,
  start,
  submitUseCase,
  selectConnection,
  submitTableConfig,
  sendFreeText,
} = useDataSourceFlow();

const draft = ref('');
const scrollArea = ref<HTMLElement | null>(null);

const canSend = computed(() => isComplete.value && draft.value.trim().length > 0);
const showSuggestions = computed(() => isComplete.value && !hasFreeText.value);

async function scrollToBottom() {
  await nextTick();
  const el = scrollArea.value;
  if (el) el.scrollTop = el.scrollHeight;
}

watch(() => items.value.length, () => scrollToBottom());
watch(activeStep, () => scrollToBottom());
watch(isCreating, () => scrollToBottom());

function askSuggested(question: string) {
  sendFreeText(question);
}

function onSend() {
  if (!canSend.value) return;
  sendFreeText(draft.value);
  draft.value = '';
}

function restart() {
  start();
  draft.value = '';
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <!-- Conversation -->
    <div ref="scrollArea" class="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
      <template v-for="item in items" :key="item.id">
        <!-- Assistant message -->
        <div v-if="item.kind === 'assistant-text'" class="flex justify-start">
          <div class="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#F5F1FC] px-3.5 py-2 text-sm leading-relaxed text-[#25262E]">
            {{ item.text }}
          </div>
        </div>

        <!-- Free-text user message -->
        <div v-else-if="item.kind === 'user-text'" class="flex justify-end">
          <div class="max-w-[85%] rounded-2xl rounded-br-sm bg-[#3B1770] px-3.5 py-2 text-sm leading-relaxed text-white">
            {{ item.text }}
          </div>
        </div>

        <!-- Completed step recap -->
        <div v-else-if="item.kind === 'user-recap'" class="flex justify-end">
          <div class="max-w-[85%] rounded-2xl rounded-br-sm border border-[#E9E0F7] bg-[#F5F1FC] px-3.5 py-2 text-sm">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-[#3B1770]">{{ item.recap?.title }}</p>
            <p v-for="(line, index) in item.recap?.lines" :key="index" class="text-[#25262E]">{{ line }}</p>
          </div>
        </div>
      </template>

      <!-- Active step widget, inline in the conversation -->
      <div v-if="activeStep" class="pt-1">
        <UseCaseStep v-if="activeStep === 'use-case'" @submit="submitUseCase" />
        <ConnectionStep
          v-else-if="activeStep === 'connection'"
          :connections="connections"
          @select="selectConnection"
        />
        <TableConfigStep
          v-else-if="activeStep === 'configuration'"
          :schemas="schemas"
          :tables="tables"
          @submit="submitTableConfig"
        />
      </div>

      <!-- Creating loader -->
      <div v-if="isCreating" class="flex justify-start">
        <div class="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-[#F5F1FC] px-3.5 py-2.5 text-sm text-[#6B6B6B]">
          <svg viewBox="0 0 24 24" class="h-4 w-4 animate-spin text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
          </svg>
          Creating your data source…
        </div>
      </div>

      <!-- Suggested questions about the new data source -->
      <div v-if="showSuggestions" class="pt-1">
        <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">Ask about this data source</p>
        <div class="flex flex-col items-start gap-2">
          <button
            v-for="question in suggestedQuestions"
            :key="question"
            type="button"
            class="rounded-full border border-[#E2E2E2] px-3 py-1.5 text-left text-xs text-[#6B6B6B] transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
            @click="askSuggested(question)"
          >
            {{ question }}
          </button>
        </div>
      </div>

      <!-- Completion actions -->
      <div v-if="isComplete" class="flex justify-start pt-1">
        <button
          type="button"
          class="rounded-md border border-[#E2E2E2] px-3 py-1.5 text-xs font-medium text-[#6B6B6B] transition-colors hover:border-[#3B1770] hover:text-[#3B1770]"
          @click="restart"
        >
          Create another data source
        </button>
      </div>
    </div>

    <!-- Composer (only after the data source is created) -->
    <div v-if="isComplete" class="mx-auto w-full max-w-3xl flex-shrink-0 p-4">
      <div class="flex items-end gap-2 rounded-xl border border-[#E2E2E2] bg-white px-3 py-2 focus-within:border-[#3B1770]">
        <textarea
          v-model="draft"
          rows="1"
          placeholder="Ask Simba about the data source…"
          class="max-h-28 flex-1 resize-none bg-transparent text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:outline-none"
          @keydown.enter.exact.prevent="onSend"
        ></textarea>
        <button
          type="button"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#3B1770] text-white transition-opacity hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canSend"
          title="Send"
          @click="onSend"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14m0 0-5-5m5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
