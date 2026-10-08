<script setup lang="ts">
import { ref, watch, nextTick, computed, onBeforeUnmount } from 'vue';
import { CONNECTOR_ICONS } from '~/composables/connectorIcons';
import {
  buildSetupHeadline,
  buildSetupSections,
  detectsEditIntent,
  detectsUpdateIntent,
  shouldShowAgentEntry,
  useDataSourceFlow,
  type DataSourceSetup,
  type FlowItem,
} from '~/composables/useDataSourceFlow';
import { useLiveCatalog, formatAssetModifiedAt } from '~/composables/useWorkspaceAssets';
import {
  MAX_PHRASINGS,
  buildPhrasingSuggestions,
  findCertifiedMatch,
  normalizeQuestion,
  useCertifiedQuestions,
  type CertifiedQuestion,
  type CertifyPayload,
} from '~/composables/useCertifiedQuestions';
import {
  buildDataAnswer,
  type AnswerSource,
  type DataAnswer,
  type RefineRequest,
} from '~/composables/agentDataAnswers';
import CreateDataSourceModal from '~/components/workspace/CreateDataSourceModal.vue';
import HistoryDisclosure from '~/components/workspace/HistoryDisclosure.vue';
import AgentThinkingPanel from '~/components/workspace/AgentThinkingPanel.vue';
import CertifyQuestionCard from '~/components/workspace/CertifyQuestionCard.vue';
import RefineAnswerCard from '~/components/workspace/RefineAnswerCard.vue';

const props = withDefaults(
  defineProps<{
    hasSources?: boolean;
    importedSourceNames?: string[];
    /** How the agent names the card an "update" message would change; null when none. */
    updateTargetLabel?: string | null;
    /** Source data questions are answered from (open or last previewed); null when none. */
    activeSource?: AnswerSource | null;
  }>(),
  {
    hasSources: false,
    importedSourceNames: () => [],
    updateTargetLabel: null,
    activeSource: null,
  },
);

/** Fires once the agent finishes assessing a new data source, or when a catalog source is imported. */
const emit = defineEmits<{
  created: [setup: DataSourceSetup];
  import: [sourceId: string];
  iterate: [];
  /** An "update" message was answered; the host highlights the changed card. */
  update: [];
  /** Show a certified question in the preview's Certified questions tab. */
  openCertified: [questionId: string];
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
  refineAnswer,
} = useDataSourceFlow();

const { questionsFor, findQuestion, certify, updateQuestion } = useCertifiedQuestions();

const activeQuestions = computed(() => questionsFor(props.activeSource?.id ?? null));

const alreadyImportedNames = computed(() => new Set(props.importedSourceNames));

const { catalog: importableCatalog } = useLiveCatalog();

const showEntryActions = computed(() =>
  shouldShowAgentEntry(props.hasSources, items.value.length),
);

const isPickingImport = ref(false);
const recentImportableSources = computed(() => importableCatalog.value.slice(0, 3));

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
  const source = importableCatalog.value.find((item) => item.id === sourceId);
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

type ResponseRating = 'up' | 'down';

/** Latest assistant reply, ignoring setup cards and thinking runs. */
function findLatestAssistantId(flowItems: FlowItem[]): string | null {
  for (let index = flowItems.length - 1; index >= 0; index -= 1) {
    if (flowItems[index]?.kind === 'assistant-text') return flowItems[index].id;
  }
  return null;
}

/** A finished assistant reply blocks the next prompt until it is rated. */
function isResponseRatingRequired(
  latestAssistantId: string | null,
  responseRatings: Readonly<Record<string, ResponseRating>>,
  agentRunning: boolean,
): boolean {
  if (agentRunning || !latestAssistantId) return false;
  return responseRatings[latestAssistantId] === undefined;
}

function precedingUserText(flowItems: FlowItem[], itemId: string): string {
  const index = flowItems.findIndex((item) => item.id === itemId);
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const item = flowItems[cursor];
    if (item?.kind === 'user-text' && item.text?.trim()) return item.text;
  }
  return '';
}

function ratingCaption(rating: ResponseRating): string {
  return rating === 'up' ? 'Marked helpful' : 'Marked not helpful';
}

/** What a rating opens under a data answer: certify after 👍, refine after 👎. */
type FollowUp = 'certify' | 'refine';

function captionFor(itemId: string): string {
  const rating = ratings.value[itemId];
  return rating ? ratingCaption(rating) : '';
}

const draft = ref('');
const scrollArea = ref<HTMLElement | null>(null);
const composer = ref<HTMLTextAreaElement | null>(null);
const ratings = ref<Record<string, ResponseRating>>({});
const copiedId = ref<string | null>(null);
const originalOpenId = ref<string | null>(null);
const skipRatingGate = ref(false);
const followUps = ref<Record<string, FollowUp>>({});
/** Answer item → the certified question saved from it. */
const certifiedFrom = ref<Record<string, string>>({});

const ratingRequired = computed(
  () =>
    !skipRatingGate.value &&
    isResponseRatingRequired(findLatestAssistantId(items.value), ratings.value, isAgentRunning.value),
);

const canSend = computed(
  () => !isAgentRunning.value && !ratingRequired.value && draft.value.trim().length > 0,
);
const composerPlaceholder = computed(() => {
  if (isAgentRunning.value) return 'Working on it…';
  if (ratingRequired.value) return 'Rate this response to continue';
  return 'Ask anything…';
});

/** The certified question an answer reused or was saved as, if it still exists. */
function certifiedIdFor(item: FlowItem): string | null {
  const id = item.certifiedId ?? certifiedFrom.value[item.id];
  return id && findQuestion(id) ? id : null;
}

/** User messages that matched a certified question, keyed by item id. */
const matchedQuestions = computed(() => {
  const matches: Record<string, CertifiedQuestion> = {};
  for (const item of items.value) {
    if (item.kind !== 'user-text' || !item.certifiedId) continue;
    const question = findQuestion(item.certifiedId);
    if (question) matches[item.id] = question;
  }
  return matches;
});

function gateTitle(item: FlowItem): string {
  return item.answer ? 'Was this answer right?' : 'Was this response helpful?';
}

function gateSubtitle(item: FlowItem): string {
  if (!item.answer || item.certifiedId) return 'Choose one to continue.';
  return 'Helpful answers can be certified so everyone gets the same result.';
}

/** The certified question behind an answer (matched or saved from it); the 👍 card then updates it. */
function existingQuestion(item: FlowItem): CertifiedQuestion | null {
  const id = certifiedIdFor(item);
  return id ? (findQuestion(id) ?? null) : null;
}

/** Any answer can be rated, not just the latest, so bring the opened card itself into view. */
async function openFollowUp(itemId: string, followUp: FollowUp): Promise<void> {
  followUps.value = { ...followUps.value, [itemId]: followUp };
  await nextTick();
  scrollArea.value
    ?.querySelector<HTMLElement>(`[data-follow-up="${itemId}"]`)
    ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function closeFollowUp(itemId: string): void {
  const { [itemId]: _closed, ...rest } = followUps.value;
  followUps.value = rest;
}


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

let copyTimer: number | null = null;

function clearCopyTimer(): void {
  if (copyTimer !== null) window.clearTimeout(copyTimer);
  copyTimer = null;
}

onBeforeUnmount(() => {
  stopFollowing();
  clearCopyTimer();
});

/** Sends a prompt and tells the host about canvas-affecting intents ("update" wins over "edit"). */
function sendToAgent(text: string): void {
  // Unanswered certify / refine cards close; the toolbar can reopen certify later.
  followUps.value = {};
  const source = props.activeSource;
  sendFreeText(text, {
    updateTarget: props.updateTargetLabel,
    source,
    certified: source ? findCertifiedMatch(activeQuestions.value, source.id, text) : null,
  });
  if (detectsUpdateIntent(text)) {
    if (props.updateTargetLabel) emit('update');
  } else if (detectsEditIntent(text)) {
    emit('iterate');
  }
}

function ask(question: string) {
  if (ratingRequired.value || isAgentRunning.value) return;
  sendToAgent(question);
  draft.value = '';
}

function onSend() {
  if (!canSend.value) return;
  sendToAgent(draft.value);
  draft.value = '';
}

/**
 * Every reply follows up: 👍 certifies (or updates the certified question), 👎 refines.
 * Replies that aren't data answers let the author type the question, or just take feedback.
 */
function rateResponse(itemId: string, rating: ResponseRating): void {
  ratings.value = { ...ratings.value, [itemId]: rating };
  openFollowUp(itemId, rating === 'up' ? 'certify' : 'refine');
}

/** The source an answer was asked against, with the live table list when it's still active. */
function sourceForAnswer(answer: DataAnswer): AnswerSource {
  if (props.activeSource?.id === answer.sourceId) return props.activeSource;
  return { id: answer.sourceId, name: answer.sourceName, tables: [] };
}

/** A typed question gets its query from the active source, like any answer would. */
function answerForTypedQuestion(text: string): DataAnswer | null {
  const question = text.trim();
  return props.activeSource && question ? buildDataAnswer(question, props.activeSource) : null;
}

/** Existing phrasings first, then new ones, without repeats or the question itself. */
function mergePhrasings(question: string, current: string[], added: string[]): string[] {
  const seen = new Set([normalizeQuestion(question)]);
  const merged: string[] = [];
  for (const phrase of [...current, ...added]) {
    const key = normalizeQuestion(phrase);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(phrase);
  }
  return merged.slice(0, MAX_PHRASINGS);
}

function onCertify(item: FlowItem, payload: CertifyPayload): void {
  const existing = existingQuestion(item);
  if (existing) {
    closeFollowUp(item.id);
    const changed =
      payload.comment !== existing.comment ||
      payload.phrasings.join('\n') !== existing.phrasings.join('\n');
    if (changed) updateQuestion(existing.id, { phrasings: payload.phrasings, comment: payload.comment });
    return;
  }

  const answer = item.answer ?? answerForTypedQuestion(payload.question);
  if (!answer) return;
  closeFollowUp(item.id);

  // A typed question may already be certified: add to it rather than certify it twice.
  const key = normalizeQuestion(answer.question);
  const duplicate = questionsFor(answer.sourceId).find((question) => normalizeQuestion(question.question) === key);
  if (duplicate) {
    updateQuestion(duplicate.id, {
      phrasings: mergePhrasings(duplicate.question, duplicate.phrasings, payload.phrasings),
      comment: payload.comment || duplicate.comment,
    });
    certifiedFrom.value = { ...certifiedFrom.value, [item.id]: duplicate.id };
    return;
  }

  const question = certify({
    sourceId: answer.sourceId,
    question: answer.question,
    phrasings: payload.phrasings,
    summary: answer.summary,
    sql: answer.sql,
    comment: payload.comment,
  });
  certifiedFrom.value = { ...certifiedFrom.value, [item.id]: question.id };
}

function onRefine(item: FlowItem, request: RefineRequest): void {
  closeFollowUp(item.id);
  refineAnswer(item.id, request, item.answer ? sourceForAnswer(item.answer) : props.activeSource);
}

/** The certified question saved from this answer, if it still exists. */
function savedQuestionId(item: FlowItem): string | null {
  const id = certifiedFrom.value[item.id];
  return id && findQuestion(id) ? id : null;
}

/** A 👍'd answer that isn't certified yet; answers to certified questions don't qualify. */
function canCertify(item: FlowItem): boolean {
  return !item.certifiedId && !savedQuestionId(item) && ratings.value[item.id] === 'up';
}

/** The pill opens a saved question in configuration, or toggles the certify card. */
function onCertifyAction(item: FlowItem): void {
  const id = savedQuestionId(item);
  if (id) emit('openCertified', id);
  else if (followUps.value[item.id] === 'certify') closeFollowUp(item.id);
  else openFollowUp(item.id, 'certify');
}

async function copyResponse(item: FlowItem): Promise<void> {
  const text = item.text?.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  copiedId.value = item.id;
  clearCopyTimer();
  copyTimer = window.setTimeout(() => {
    if (copiedId.value === item.id) copiedId.value = null;
    copyTimer = null;
  }, 1500);
}

function originalLabel(item: FlowItem): string {
  const open = originalOpenId.value === item.id;
  if (item.answer) return open ? 'Hide query' : 'View query';
  return open ? 'Hide original response' : 'View original response';
}

function toggleOriginal(itemId: string): void {
  originalOpenId.value = originalOpenId.value === itemId ? null : itemId;
}

/** Data answers re-ask their own question, so a refined answer doesn't resend the refine note. */
function reloadText(item: FlowItem): string {
  return item.answer?.question ?? precedingUserText(items.value, item.id);
}

function reloadResponse(item: FlowItem): void {
  if (ratingRequired.value || isAgentRunning.value) return;
  const text = reloadText(item);
  if (!text) return;
  sendToAgent(text);
}

function canReload(item: FlowItem): boolean {
  return !ratingRequired.value && !isAgentRunning.value && reloadText(item).length > 0;
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
    <!-- Start here: agent purpose first; create / import are shortcuts to unlock chat -->
    <div v-if="showEntryActions" class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-6">
      <div class="w-full max-w-xl">
        <template v-if="!isPickingImport">
          <div class="mx-auto mb-5 w-fit text-left">
            <p class="mb-3 text-base font-semibold text-[#25262E]">Ask the agent about your data</p>
            <ul class="space-y-2 text-sm leading-snug text-[#6B6B6B]">
            <li class="flex items-start gap-2.5">
              <span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#3B1770]" aria-hidden="true" />
              <span><span class="font-medium text-[#25262E]">Ask</span> questions in plain language</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#3B1770]" aria-hidden="true" />
              <span><span class="font-medium text-[#25262E]">Preview</span> the data, then iterate until it looks right</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#3B1770]" aria-hidden="true" />
              <span><span class="font-medium text-[#25262E]">Edit</span> a source yourself when you want more control</span>
            </li>
          </ul>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="flex h-full items-start gap-3 rounded-xl border border-[#E2E2E2] bg-white p-4 text-left transition-colors hover:border-[#3B1770] hover:bg-[#F8F6FC]"
              @click="onCreateSource"
            >
              <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke-linecap="round" />
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-[#25262E]">Create a data source</span>
                <span class="mt-1 block text-xs leading-relaxed text-[#9A9A9A]">
                  Open the wizard to describe a use case, pick a connection, and choose tables.
                </span>
              </span>
            </button>

            <button
              type="button"
              class="flex h-full items-start gap-3 rounded-xl border border-[#E2E2E2] bg-white p-4 text-left transition-colors hover:border-[#3B1770] hover:bg-[#F8F6FC]"
              @click="startImportPick"
            >
              <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 3v12M8 11l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M4 21h16" stroke-linecap="round" />
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-[#25262E]">Import a source</span>
                <span class="mt-1 block text-xs leading-relaxed text-[#9A9A9A]">
                  Choose an existing data source from inventory to add to this workspace.
                </span>
              </span>
            </button>
          </div>

          <!-- Temporary: inventory list hidden to preview the side-by-side import card.
          <p class="mb-2 mt-5 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
            Import from inventory
          </p>
          <div class="space-y-1">
            <button
              v-for="source in recentImportableSources"
              :key="source.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border border-[#E2E2E2] px-3 py-1.5 text-left transition-colors"
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
                <span class="block truncate text-[11px] text-[#9A9A9A]">
                  {{ source.subtitle }}
                  <template v-if="alreadyImportedNames.has(source.name)"> · already added</template>
                </span>
              </span>
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#3B1770] transition-colors hover:bg-[#F8F6FC]"
              @click="startImportPick"
            >
              See all
            </button>
          </div>
          -->
        </template>

        <template v-else>
          <button
            type="button"
            class="mb-3 inline-flex items-center gap-1 text-xs font-medium text-[#6B6B6B] transition-colors hover:text-[#3B1770]"
            @click="cancelImportPick"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Back
          </button>
          <p class="mb-1 text-center text-base font-semibold text-[#25262E]">Import a data source</p>
          <p class="mb-3 text-center text-xs text-[#9A9A9A]">
            Choose an existing source from inventory to add to this workspace.
          </p>
          <div class="space-y-1">
            <button
              v-for="source in importableCatalog"
              :key="source.id"
              type="button"
              class="flex w-full items-start gap-2 rounded-lg border border-[#E2E2E2] px-3 py-2 text-left transition-colors"
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
                <span class="mt-1 block text-[10px] text-[#C4C4C4]">
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
          <div v-if="item.kind === 'assistant-text'">
            <div class="flex justify-start">
              <div class="max-w-[85%]">
                <div class="w-fit max-w-full whitespace-pre-line rounded-2xl rounded-bl-sm bg-[#F5F1FC] px-3.5 py-2 text-sm leading-relaxed text-[#25262E]">
                  {{ item.text }}
                </div>

                <div class="mt-1.5 flex items-center gap-0.5 text-[#3D4C66]">
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#F1F1F1] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    title="Reload response"
                    aria-label="Reload response"
                    :disabled="!canReload(item)"
                    @click="reloadResponse(item)"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path d="M20 12a8 8 0 1 1-2.3-5.7" stroke-linecap="round" />
                      <path d="M20 4v5h-5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#F1F1F1]"
                    :class="ratings[item.id] === 'up' ? 'text-[#3B1770]' : ''"
                    title="Helpful"
                    :aria-label="ratings[item.id] === 'up' ? 'Marked helpful' : 'Mark as helpful'"
                    :aria-pressed="ratings[item.id] === 'up'"
                    @click="rateResponse(item.id, 'up')"
                  >
                    <svg v-if="ratings[item.id] === 'up'" viewBox="0 0 24 24" class="h-[15px] w-[15px]" fill="currentColor" aria-hidden="true">
                      <path
                        d="M2 9h3v12H2a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Zm5.293-1.293 6.4-6.4a.5.5 0 0 1 .654-.047l.853.64a1.5 1.5 0 0 1 .553 1.57L14.6 8H21a2 2 0 0 1 2 2v2.104a2 2 0 0 1-.15.762l-3.095 7.515a1 1 0 0 1-.925.619H8a1 1 0 0 1-1-1V8.414a1 1 0 0 1 .293-.707Z"
                      />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path
                        d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.2-7.2A1.6 1.6 0 0 1 14.6 4v4h5.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18.6 19H7"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#F1F1F1]"
                    :class="ratings[item.id] === 'down' ? 'text-[#565660]' : ''"
                    title="Not helpful"
                    :aria-label="ratings[item.id] === 'down' ? 'Marked not helpful' : 'Mark as not helpful'"
                    :aria-pressed="ratings[item.id] === 'down'"
                    @click="rateResponse(item.id, 'down')"
                  >
                    <svg v-if="ratings[item.id] === 'down'" viewBox="0 0 24 24" class="h-[15px] w-[15px] rotate-180" fill="currentColor" aria-hidden="true">
                      <path
                        d="M2 9h3v12H2a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Zm5.293-1.293 6.4-6.4a.5.5 0 0 1 .654-.047l.853.64a1.5 1.5 0 0 1 .553 1.57L14.6 8H21a2 2 0 0 1 2 2v2.104a2 2 0 0 1-.15.762l-3.095 7.515a1 1 0 0 1-.925.619H8a1 1 0 0 1-1-1V8.414a1 1 0 0 1 .293-.707Z"
                      />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4 rotate-180" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path
                        d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.2-7.2A1.6 1.6 0 0 1 14.6 4v4h5.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18.6 19H7"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#F1F1F1]"
                    :title="copiedId === item.id ? 'Copied' : 'Copy response'"
                    :aria-label="copiedId === item.id ? 'Copied' : 'Copy response'"
                    @click="copyResponse(item)"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <rect x="8" y="8" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md font-mono text-[13px] leading-none transition-colors hover:bg-[#F1F1F1]"
                    :class="originalOpenId === item.id ? 'bg-[#F1F1F1]' : ''"
                    :title="item.answer ? 'View query' : 'View original response'"
                    :aria-label="originalLabel(item)"
                    :aria-pressed="originalOpenId === item.id"
                    @click="toggleOriginal(item.id)"
                  >
                    { }
                  </button>
                  <!-- Certified once saved from this answer; "Certify" reopens a dismissed card -->
                  <template v-if="savedQuestionId(item) || canCertify(item)">
                    <span class="mx-1.5 h-5 w-px bg-[#E2E2E2]" aria-hidden="true" />
                    <button
                      type="button"
                      class="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors"
                      :class="
                        savedQuestionId(item)
                          ? 'border-[#D4C4EF] bg-[#F5F1FC] text-[#3B1770] hover:border-[#3B1770]'
                          : followUps[item.id] === 'certify'
                            ? 'border-[#3B1770] bg-[#F5F1FC] text-[#3B1770]'
                            : 'border-[#E2E2E2] text-[#3D4C66] hover:border-[#3B1770] hover:text-[#3B1770]'
                      "
                      :title="savedQuestionId(item) ? 'Question certified. View it in Configuration' : 'Certify this question'"
                      :aria-pressed="savedQuestionId(item) ? undefined : followUps[item.id] === 'certify'"
                      @click="onCertifyAction(item)"
                    >
                      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke-linejoin="round" />
                        <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      {{ savedQuestionId(item) ? 'Certified' : 'Certify' }}
                    </button>
                  </template>
                </div>

                <div v-if="originalOpenId === item.id && item.answer" class="mt-1.5 space-y-1.5">
                  <p class="text-xs leading-relaxed text-[#6B6B6B]">{{ item.answer.summary }}</p>
                  <pre class="overflow-x-auto rounded-lg bg-[#F7F7F8] px-3 py-2 font-mono text-xs leading-relaxed text-[#25262E]">{{ item.answer.sql }}</pre>
                </div>
                <pre
                  v-else-if="originalOpenId === item.id"
                  class="mt-1.5 whitespace-pre-wrap rounded-lg bg-[#F7F7F8] px-3 py-2 font-mono text-xs leading-relaxed text-[#25262E]"
                >{{ item.text }}</pre>

                <p v-if="ratings[item.id] && !savedQuestionId(item)" class="mt-1.5 flex items-center gap-1 text-xs text-[#6B6B6B]">
                  <svg viewBox="0 0 24 24" class="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {{ captionFor(item.id) }}
                </p>
              </div>
            </div>

            <!-- The gate: full-width and elevated so it reads as the screen's next required action, not a footnote on the reply. -->
            <section
              v-if="!skipRatingGate && !ratings[item.id] && findLatestAssistantId(items) === item.id && !isAgentRunning"
              :aria-labelledby="`quality-prompt-title-${item.id}`"
              class="rating-prompt-enter relative mt-3 w-full rounded-2xl bg-[#3B1770] p-5"
            >
              <!-- Caret ties the card back to the thumbs icons it echoes, like a tooltip pointing up at its anchor. -->
              <span class="absolute -top-1.5 left-14 h-3 w-3 rotate-45 rounded-tl-[2px] bg-[#3B1770]" aria-hidden="true" />

              <h2 :id="`quality-prompt-title-${item.id}`" class="text-base font-semibold text-white">
                {{ gateTitle(item) }}
              </h2>
              <p class="mt-0.5 text-sm text-[#D9C9F0]">{{ gateSubtitle(item) }}</p>
              <div class="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="group flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#E2E2E2] bg-white text-sm font-semibold text-[#25262E] transition-all hover:border-[#3B1770] hover:bg-[#F8F6FC] active:scale-[0.98]"
                  @click="rateResponse(item.id, 'up')"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0 text-[#3B1770]" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
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
                  class="group flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#E2E2E2] bg-white text-sm font-semibold text-[#25262E] transition-all hover:border-[#8B8B93] hover:bg-[#F7F7F8] active:scale-[0.98]"
                  @click="rateResponse(item.id, 'down')"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4 flex-shrink-0 rotate-180 text-[#6B6B6B]" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path
                      d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4.2-7.2A1.6 1.6 0 0 1 14.6 4v4h5.1a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18.6 19H7"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                  </svg>
                  Not helpful
                </button>
              </div>

              <label class="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-[#D9C9F0]">
                <input
                  v-model="skipRatingGate"
                  type="checkbox"
                  class="h-3.5 w-3.5 cursor-pointer rounded-sm"
                  style="accent-color: #ffffff"
                />
                Don't show this again
              </label>
            </section>

            <!-- Rating follow-ups take the gate's place: 👍 certifies, 👎 refines -->
            <div
              v-else-if="followUps[item.id] === 'certify' && !isAgentRunning"
              :data-follow-up="item.id"
              class="rating-prompt-enter"
            >
              <CertifyQuestionCard
                v-if="existingQuestion(item) || item.answer"
                :card-id="item.id"
                :question="existingQuestion(item)?.question ?? item.answer?.question ?? ''"
                :source-name="item.answer?.sourceName ?? activeSource?.name ?? ''"
                :suggestions="
                  buildPhrasingSuggestions(
                    existingQuestion(item)?.question ?? item.answer?.question ?? '',
                    existingQuestion(item)?.phrasings ?? [],
                  )
                "
                :certified-by="existingQuestion(item)?.createdBy ?? null"
                :initial-phrasings="existingQuestion(item)?.phrasings ?? []"
                :initial-comment="existingQuestion(item)?.comment ?? ''"
                @save="onCertify(item, $event)"
                @dismiss="closeFollowUp(item.id)"
              />
              <!-- Not an answer: the author names the question and the agent writes its query -->
              <CertifyQuestionCard
                v-else
                :card-id="item.id"
                question=""
                question-editable
                :source-name="activeSource?.name ?? ''"
                :blocked-reason="activeSource ? null : 'Create or import a data source to certify questions about it.'"
                @save="onCertify(item, $event)"
                @dismiss="closeFollowUp(item.id)"
              />
            </div>
            <div
              v-else-if="followUps[item.id] === 'refine' && !isAgentRunning"
              :data-follow-up="item.id"
              class="rating-prompt-enter"
            >
              <RefineAnswerCard
                :card-id="item.id"
                :has-query="Boolean(item.answer)"
                @refine="onRefine(item, $event)"
                @dismiss="closeFollowUp(item.id)"
              />
            </div>
          </div>

          <!-- User message -->
          <div v-else-if="item.kind === 'user-text'" class="flex items-center justify-end gap-1.5">
            <!-- Marks a question that matched a certified one; opens it in the certified list -->
            <span v-if="matchedQuestions[item.id]" class="group relative flex-shrink-0">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-full text-[#3B1770] transition-colors hover:bg-[#F5F1FC]"
                :aria-label="`Matches certified question: ${matchedQuestions[item.id].question}. View in Certified questions`"
                @click="emit('openCertified', matchedQuestions[item.id].id)"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke-linejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <span
                role="tooltip"
                class="pointer-events-none invisible absolute right-0 top-full z-30 mt-1 w-64 rounded-md border border-[#E2E2E2] bg-white px-3 py-2 text-[11px] leading-relaxed text-[#6B6B6B] shadow-md group-hover:visible group-focus-within:visible"
              >
                <span class="block font-semibold text-[#3B1770]">Matches a certified question</span>
                <span class="mt-0.5 block text-[#25262E]">“{{ matchedQuestions[item.id].question }}”</span>
                <span class="mt-1 block">
                  Certified by {{ matchedQuestions[item.id].createdBy }}. Answered with its saved query.
                </span>
                <span class="mt-1 block font-medium text-[#3B1770]">Click to view it in Certified questions</span>
              </span>
            </span>
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

        <!-- Certified questions for the active source: a starting point for an empty thread -->
        <div v-if="!items.length && activeSource && activeQuestions.length" class="pt-1">
          <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
            Certified questions · {{ activeSource.name }}
          </p>
          <div class="flex flex-col items-start gap-2">
            <button
              v-for="question in activeQuestions"
              :key="question.id"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-[#D4C4EF] bg-[#F8F6FC] px-3 py-1.5 text-left text-xs text-[#3B1770] transition-colors hover:border-[#3B1770] hover:bg-[#F5F1FC]"
              @click="ask(question.question)"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke-linejoin="round" />
                      <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ question.question }}
            </button>
          </div>
        </div>

        <!-- Suggested questions about the new data source -->
        <div v-if="suggestedQuestions.length && !ratingRequired" class="pt-1">
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
          class="flex items-center gap-2 rounded-full border-2 bg-white py-1.5 pl-5 pr-1.5 transition-colors"
          :class="ratingRequired ? 'border-[#E2E2E2]' : 'border-[#C9B8E8] focus-within:border-[#8B5CF6]'"
        >
          <textarea
            ref="composer"
            v-model="draft"
            rows="1"
            :placeholder="composerPlaceholder"
            :disabled="isAgentRunning || ratingRequired"
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

<style scoped>
@keyframes rating-prompt-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rating-prompt-enter {
  animation: rating-prompt-enter 220ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .rating-prompt-enter {
    animation: none;
  }
}
</style>
