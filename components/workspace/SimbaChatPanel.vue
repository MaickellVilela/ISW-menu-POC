<script setup lang="ts">
import { ref, watch, nextTick, computed, onBeforeUnmount } from 'vue';
import {
  buildSetupHeadline,
  buildSetupSections,
  useDataSourceFlow,
  type FlowItem,
} from '~/composables/useDataSourceFlow';
import CreateDataSourceModal from '~/components/workspace/CreateDataSourceModal.vue';
import HistoryDisclosure from '~/components/workspace/HistoryDisclosure.vue';
import AgentThinkingPanel from '~/components/workspace/AgentThinkingPanel.vue';

const {
  items,
  isWizardOpen,
  suggestedQuestions,
  isAgentRunning,
  showStarterPrompts,
  starterPrompts,
  connections,
  schemas,
  cancelWizard,
  completeWizard,
  completeAgentRun,
  sendFreeText,
} = useDataSourceFlow();

const draft = ref('');
const scrollArea = ref<HTMLElement | null>(null);

const canSend = computed(() => !isAgentRunning.value && draft.value.trim().length > 0);
const composerPlaceholder = computed(() =>
  isAgentRunning.value ? 'Simba is working…' : 'Message Simba…',
);

async function scrollToBottom() {
  await nextTick();
  const el = scrollArea.value;
  if (el) el.scrollTop = el.scrollHeight;
}

watch(() => items.value.length, scrollToBottom);

// The thinking panel grows on its own timers, so follow it while a run is active.
let followTimer: number | null = null;

function stopFollowing() {
  if (followTimer !== null) window.clearInterval(followTimer);
  followTimer = null;
}

watch(isAgentRunning, (running) => {
  stopFollowing();
  if (running) followTimer = window.setInterval(scrollToBottom, 400);
});

onBeforeUnmount(stopFollowing);

function ask(question: string) {
  sendFreeText(question);
  draft.value = '';
}

function onSend() {
  if (!canSend.value) return;
  sendFreeText(draft.value);
  draft.value = '';
}

function setupHeadline(item: FlowItem): string {
  return item.setup ? buildSetupHeadline(item.setup) : '';
}

function setupSections(item: FlowItem) {
  return item.setup ? buildSetupSections(item.setup) : [];
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

        <!-- User message -->
        <div v-else-if="item.kind === 'user-text'" class="flex justify-end">
          <div class="max-w-[85%] rounded-2xl rounded-br-sm bg-[#3B1770] px-3.5 py-2 text-sm leading-relaxed text-white">
            {{ item.text }}
          </div>
        </div>

        <!-- Modal result, collapsed in history -->
        <HistoryDisclosure
          v-else-if="item.kind === 'setup-summary'"
          title="Data source setup"
          :meta="setupHeadline(item)"
        >
          <div class="space-y-3">
            <div v-for="section in setupSections(item)" :key="section.title">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-[#3B1770]">
                {{ section.title }}
              </p>
              <p v-for="(line, index) in section.lines" :key="index" class="text-[13px] text-[#25262E]">
                {{ line }}
              </p>
            </div>
          </div>
        </HistoryDisclosure>

        <!-- Agent thinking process: expanded while running, collapsed once done -->
        <HistoryDisclosure
          v-else-if="item.kind === 'agent-run'"
          title="Agent thinking process"
          :meta="item.run?.running ? 'Running…' : 'Completed'"
          :force-open="item.run?.running ?? false"
        >
          <AgentThinkingPanel
            :connection-name="item.run?.connectionName ?? ''"
            :running="item.run?.running ?? false"
            @completed="completeAgentRun(item.id)"
          />
        </HistoryDisclosure>
      </template>

      <!-- Starter prompts before the first message -->
      <div v-if="showStarterPrompts" class="pt-1">
        <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">Try asking</p>
        <div class="flex flex-col items-start gap-2">
          <button
            v-for="prompt in starterPrompts"
            :key="prompt"
            type="button"
            class="rounded-full border border-[#E2E2E2] px-3 py-1.5 text-left text-xs text-[#6B6B6B] transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
            @click="ask(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </div>

      <!-- Suggested questions about the new data source -->
      <div v-if="suggestedQuestions.length" class="pt-1">
        <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">Ask about this data source</p>
        <div class="flex flex-col items-start gap-2">
          <button
            v-for="question in suggestedQuestions"
            :key="question"
            type="button"
            class="rounded-full border border-[#E2E2E2] px-3 py-1.5 text-left text-xs text-[#6B6B6B] transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC] hover:text-[#3B1770]"
            @click="ask(question)"
          >
            {{ question }}
          </button>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <div class="mx-auto w-full max-w-3xl flex-shrink-0 p-4">
      <div class="flex items-end gap-2 rounded-xl border border-[#E2E2E2] bg-white px-3 py-2 focus-within:border-[#3B1770]">
        <textarea
          v-model="draft"
          rows="1"
          :placeholder="composerPlaceholder"
          :disabled="isAgentRunning"
          class="max-h-28 flex-1 resize-none bg-transparent text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:outline-none disabled:cursor-not-allowed"
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

    <CreateDataSourceModal
      :open="isWizardOpen"
      :connections="connections"
      :schemas="schemas"
      @cancel="cancelWizard"
      @submit="completeWizard"
    />
  </div>
</template>
