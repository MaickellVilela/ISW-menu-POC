<script setup lang="ts">
import { ref, watch, nextTick, computed, onBeforeUnmount } from 'vue';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import {
  buildSetupHeadline,
  buildSetupSections,
  detectsEditIntent,
  shouldShowAgentEntry,
  useDataSourceFlow,
  type DataSourceSetup,
  type FlowItem,
} from '~/composables/useDataSourceFlow';
import {
  IMPORTABLE_SOURCES,
  formatAssetModifiedAt,
} from '~/composables/useWorkspaceAssets';
import CreateDataSourceModal from '~/components/workspace/CreateDataSourceModal.vue';
import HistoryDisclosure from '~/components/workspace/HistoryDisclosure.vue';
import AgentThinkingPanel from '~/components/workspace/AgentThinkingPanel.vue';

const props = withDefaults(
  defineProps<{
    hasSources?: boolean;
    importedSourceNames?: string[];
  }>(),
  {
    hasSources: false,
    importedSourceNames: () => [],
  },
);

/** Fires once the agent finishes assessing a new data source, or when a catalog source is imported. */
const emit = defineEmits<{
  created: [setup: DataSourceSetup];
  import: [sourceId: string];
  iterate: [];
}>();

const {
  items,
  isWizardOpen,
  suggestedQuestions,
  latestSetup,
  isAgentRunning,
  connections,
  schemas,
  openWizard,
  cancelWizard,
  completeWizard,
  completeAgentRun,
  acknowledgeImport,
  sendFreeText,
} = useDataSourceFlow();

const isPickingImport = ref(false);

const alreadyImportedNames = computed(() => new Set(props.importedSourceNames));

const showEntryActions = computed(() =>
  shouldShowAgentEntry(props.hasSources, items.value.length),
);

function startImportPick(): void {
  isPickingImport.value = true;
}

function cancelImportPick(): void {
  isPickingImport.value = false;
}

function onCreateSource(): void {
  isPickingImport.value = false;
  openWizard();
}

function onPickImport(sourceId: string): void {
  const source = IMPORTABLE_SOURCES.find((item) => item.id === sourceId);
  if (!source || alreadyImportedNames.value.has(source.name)) return;
  emit('import', sourceId);
  acknowledgeImport(source.name);
}

watch(showEntryActions, (show) => {
  if (!show) isPickingImport.value = false;
});

function onRunCompleted(itemId: string) {
  if (completeAgentRun(itemId) && latestSetup.value) {
    emit('created', latestSetup.value);
  }
}

const draft = ref('');
const scrollArea = ref<HTMLElement | null>(null);

const canSend = computed(() => !isAgentRunning.value && draft.value.trim().length > 0);
const composerPlaceholder = computed(() =>
  isAgentRunning.value ? 'Working on it…' : 'Ask anything…',
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
  const text = draft.value;
  sendFreeText(text);
  if (detectsEditIntent(text)) emit('iterate');
  draft.value = '';
}

function setupHeadline(item: FlowItem): string {
  return item.setup ? buildSetupHeadline(item.setup) : '';
}

function setupSections(item: FlowItem) {
  return item.setup ? buildSetupSections(item.setup) : [];
}

defineExpose({ openWizard });
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <!-- Start here: import or create a source before chat is available -->
    <div v-if="showEntryActions" class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
      <div class="w-full max-w-xl">
        <template v-if="!isPickingImport">
          <p class="mb-1 text-center text-lg font-semibold text-[#25262E]">How do you want to start?</p>
          <p class="mb-6 text-center text-sm text-[#9A9A9A]">
            Add a data source first, then you can talk to the agent about it.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="flex flex-col items-start rounded-xl border border-[#E2E2E2] bg-white p-4 text-left transition-colors hover:border-[#3B1770] hover:bg-[#F8F6FC]"
              @click="onCreateSource"
            >
              <span class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke-linecap="round" />
                </svg>
              </span>
              <span class="text-sm font-semibold text-[#25262E]">Create a data source</span>
              <span class="mt-1 text-xs leading-relaxed text-[#9A9A9A]">
                Open the wizard to describe a use case, pick a connection, and choose tables.
              </span>
            </button>

            <button
              type="button"
              class="flex flex-col items-start rounded-xl border border-[#E2E2E2] bg-white p-4 text-left transition-colors hover:border-[#3B1770] hover:bg-[#F8F6FC]"
              @click="startImportPick"
            >
              <span class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 3v12" stroke-linecap="round" />
                  <path d="M8 11l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M4 19h16" stroke-linecap="round" />
                </svg>
              </span>
              <span class="text-sm font-semibold text-[#25262E]">Import a data source</span>
              <span class="mt-1 text-xs leading-relaxed text-[#9A9A9A]">
                Add an existing source from inventory and work over it.
              </span>
            </button>
          </div>

          <p class="mb-2 mt-6 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
            Recent data sources
          </p>
          <div class="space-y-1">
            <button
              v-for="source in IMPORTABLE_SOURCES"
              :key="source.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border border-[#E2E2E2] px-3 py-2 text-left transition-colors"
              :class="
                alreadyImportedNames.has(source.name)
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-[#D4C4EF] hover:bg-[#F8F6FC]'
              "
              :disabled="alreadyImportedNames.has(source.name)"
              @click="onPickImport(source.id)"
            >
              <img
                :src="CONNECTOR_ICONS[source.connector]"
                alt=""
                class="h-4 w-4 flex-shrink-0 object-contain"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-medium text-[#25262E]">{{ source.name }}</span>
                <span class="mt-0.5 block truncate text-[11px] text-[#9A9A9A]">
                  {{ source.subtitle }}
                  <template v-if="alreadyImportedNames.has(source.name)"> · already added</template>
                </span>
              </span>
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-lg px-3 py-2 text-[13px] font-medium text-[#3B1770] transition-colors hover:bg-[#F8F6FC]"
              @click="startImportPick"
            >
              See all
            </button>
          </div>

          <ul class="mt-8 space-y-2 text-left text-xs leading-relaxed text-[#6B6B6B]">
            <li class="flex gap-2">
              <span class="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#C9B8E8]" aria-hidden="true"></span>
              <span>Ask questions about the data — what’s in it, how tables relate, and which metrics matter.</span>
            </li>
            <li class="flex gap-2">
              <span class="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#C9B8E8]" aria-hidden="true"></span>
              <span>Iterate with the agent on a created or imported source. Those changes stay in preview and don’t need a save.</span>
            </li>
            <li class="flex gap-2">
              <span class="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#C9B8E8]" aria-hidden="true"></span>
              <span>Open Edit only when you want to change the source yourself. Save to get the agent back.</span>
            </li>
          </ul>
        </template>

        <template v-else>
          <button
            type="button"
            class="mb-4 inline-flex items-center gap-1 text-xs font-medium text-[#6B6B6B] transition-colors hover:text-[#3B1770]"
            @click="cancelImportPick"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Back
          </button>
          <p class="mb-1 text-base font-semibold text-[#25262E]">Import a data source</p>
          <p class="mb-4 text-sm text-[#9A9A9A]">
            Choose an existing data source from inventory to add to this workspace.
          </p>
          <div class="space-y-1.5">
            <button
              v-for="source in IMPORTABLE_SOURCES"
              :key="source.id"
              type="button"
              class="flex w-full items-start gap-2 rounded-lg border border-[#E2E2E2] px-3 py-2.5 text-left transition-colors"
              :class="
                alreadyImportedNames.has(source.name)
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-[#D4C4EF] hover:bg-[#F8F6FC]'
              "
              :disabled="alreadyImportedNames.has(source.name)"
              @click="onPickImport(source.id)"
            >
              <img
                :src="CONNECTOR_ICONS[source.connector]"
                alt=""
                class="mt-0.5 h-4 w-4 flex-shrink-0 object-contain"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-medium text-[#25262E]">{{ source.name }}</span>
                <span class="mt-0.5 block truncate text-[11px] text-[#9A9A9A]">{{ source.subtitle }}</span>
                <span class="mt-1.5 block text-[10px] text-[#C4C4C4]">
                  {{ source.author }} · {{ formatAssetModifiedAt(source.modifiedAt) }}
                  <template v-if="alreadyImportedNames.has(source.name)"> · already added</template>
                </span>
              </span>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Conversation, unlocked after a source is created or imported -->
    <template v-else>
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
              @completed="onRunCompleted(item.id)"
            />
          </HistoryDisclosure>
        </template>

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
        <div
          class="flex items-center gap-2 rounded-full border-2 border-[#C9B8E8] bg-white py-1.5 pl-5 pr-1.5 transition-colors focus-within:border-[#8B5CF6]"
        >
          <textarea
            v-model="draft"
            rows="1"
            :placeholder="composerPlaceholder"
            :disabled="isAgentRunning"
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
    </template>

    <CreateDataSourceModal
      :open="isWizardOpen"
      :connections="connections"
      :schemas="schemas"
      @cancel="cancelWizard"
      @submit="completeWizard"
    />
  </div>
</template>
