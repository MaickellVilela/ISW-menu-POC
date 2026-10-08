import { ref, computed, type Ref } from 'vue';
import {
  buildDataAnswer,
  buildRefinedAnswer,
  buildRefineRequestText,
  type AnswerSource,
  type DataAnswer,
  type RefineRequest,
} from '~/composables/agentDataAnswers';
import type { CertifiedQuestion } from '~/composables/useCertifiedQuestions';

export interface UseCasePayload {
  description: string;
  fileName: string | null;
}

export interface ConnectionOption {
  id: string;
  name: string;
  /** Engine label, e.g. "PostgreSQL". Empty for the "new connection" row. */
  type: string;
  kind: 'database' | 'new';
}

export interface SchemaOption {
  name: string;
  tables: string[];
}

export interface TableConfigPayload {
  schema: string;
  tables: string[];
}

/** Everything the modal collects before the agent starts. */
export interface DataSourceSetup {
  useCase: UseCasePayload;
  connection: ConnectionOption;
  tableConfig: TableConfigPayload;
}

/** Mock connections mirroring the classic connection picker. */
export const CONNECTIONS: ConnectionOption[] = [
  { id: 'new', name: 'New Connection', type: '', kind: 'new' },
  { id: 'marketing', name: 'Marketing data', type: 'PostgreSQL', kind: 'database' },
  { id: 'healthcare', name: 'Healthcare data', type: 'PostgreSQL', kind: 'database' },
  { id: 'snowflake', name: 'Snowflake', type: 'Snowflake', kind: 'database' },
  { id: 'pg6', name: 'PostgreSQL6', type: 'PostgreSQL', kind: 'database' },
  { id: 'pg5', name: 'PostgreSQL5', type: 'PostgreSQL', kind: 'database' },
  { id: 'pg4', name: 'PostgreSQL4', type: 'PostgreSQL', kind: 'database' },
  { id: 'pg3', name: 'PostgreSQL3', type: 'PostgreSQL', kind: 'database' },
  { id: 'pg2', name: 'PostgreSQL2', type: 'PostgreSQL', kind: 'database' },
];

export const SCHEMAS: SchemaOption[] = [
  { name: 'pg_toast', tables: [] },
  {
    name: 'public',
    tables: ['customers', 'marketing_campaigns', 'order_items', 'orders', 'products'],
  },
];

/** Recommended table ceiling before agent quality degrades. */
export const RECOMMENDED_TABLE_LIMIT = 5;

export interface SummarySection {
  title: string;
  lines: string[];
}

export type FlowItemKind = 'assistant-text' | 'user-text' | 'setup-summary' | 'agent-run';

export interface AgentRunState {
  connectionName: string;
  running: boolean;
}

export interface FlowItem {
  id: string;
  kind: FlowItemKind;
  text?: string;
  setup?: DataSourceSetup;
  run?: AgentRunState;
  /** Set on assistant replies that answer a data question; these can be certified. */
  answer?: DataAnswer;
  /** On a data answer: the certified question it reused instead of generating a query.
   *  On the user message: the certified question it matched. */
  certifiedId?: string;
}

export interface SendContext {
  /** Names the card an "update" message would change. */
  updateTarget?: string | null;
  /** The source data questions are answered from; null falls back to a canned reply. */
  source?: AnswerSource | null;
  /** A certified question matching the message, reused as-is. */
  certified?: CertifiedQuestion | null;
}

// --- Pure helpers (side-effect free so they can be unit tested) ---

const DATA_SOURCE_INTENT = /\bdata[\s_-]?sources?\b/i;
const EDIT_INTENT = /\bedit\b/i;
const UPDATE_INTENT = /\bupdat(e|es|ed|ing)\b/i;

/** Simulated intent recognition: the agent offers the modal when a data source is mentioned. */
export function detectsDataSourceIntent(text: string): boolean {
  return DATA_SOURCE_INTENT.test(text);
}

/** Prototype shortcut: any message with "edit" iterates on the open preview. */
export function detectsEditIntent(text: string): boolean {
  return EDIT_INTENT.test(text);
}

/** Prototype shortcut: any message with "update" changes one card and highlights it. */
export function detectsUpdateIntent(text: string): boolean {
  return UPDATE_INTENT.test(text);
}

/** `cardLabel` names the changed card, or is null when there is nothing to update. */
export function buildUpdateReply(cardLabel: string | null): string {
  if (!cardLabel) {
    return "There's nothing on a canvas to update yet. Create or import a data source, then ask me again.";
  }
  return `Done, I updated ${cardLabel}. It's highlighted on the canvas so you can see what changed.`;
}

/** How long the preview shimmer runs after an agent edit. */
export const PREVIEW_ITERATION_MS = 2800;

export function buildSetupSections(setup: DataSourceSetup): SummarySection[] {
  const useCaseLines = [setup.useCase.description];
  if (setup.useCase.fileName) useCaseLines.push(`Attached: ${setup.useCase.fileName}`);

  const connectionLine =
    setup.connection.kind === 'new'
      ? 'New connection'
      : `${setup.connection.name} · ${setup.connection.type}`;

  return [
    { title: 'Business use case', lines: useCaseLines },
    { title: 'Connection', lines: [connectionLine] },
    {
      title: 'Tables',
      lines: setup.tableConfig.tables.map((table) => `${setup.tableConfig.schema}.${table}`),
    },
  ];
}

/** Collapsed-state label for the setup card kept in the conversation history. */
export function buildSetupHeadline(setup: DataSourceSetup): string {
  const count = setup.tableConfig.tables.length;
  const noun = count === 1 ? 'table' : 'tables';
  return `${setup.connection.name} · ${count} ${noun}`;
}

export function buildAgentStartMessage(setup: DataSourceSetup): string {
  return `Got it. I'm assessing ${setup.connection.name} now — you can follow along below.`;
}

export function buildCompletionMessage(setup: DataSourceSetup): string {
  const count = setup.tableConfig.tables.length;
  const noun = count === 1 ? 'table' : 'tables';
  return `Your data source is ready. I assessed ${count} ${noun} from ${setup.connection.name}. Ask me anything about it.`;
}

/** Three starter questions about the freshly created data source. */
export function buildSuggestedQuestions(payload: TableConfigPayload): string[] {
  const [first, second] = payload.tables;
  const questions = ['Summarize what this data source contains.'];
  if (first) questions.push(`What are the key metrics in ${first}?`);
  if (first && second) questions.push(`How do ${first} and ${second} relate?`);
  else if (first) questions.push(`Which columns in ${first} matter most?`);
  while (questions.length < 3) {
    questions.push('What data quality issues should I check?');
  }
  return questions.slice(0, 3);
}

export function buildIntentReply(hasDataSource: boolean): string {
  return hasDataSource
    ? 'Sure — I opened the setup so you can describe the new data source.'
    : 'Happy to help. I opened the setup so you can describe the use case, pick a connection, and choose tables.';
}

export function buildFallbackReply(hasDataSource: boolean): string {
  return hasDataSource
    ? 'I can answer from the data source you just created, or build another one — just mention a data source.'
    : 'I can create a data source and then answer questions about it. Mention a data source whenever you are ready to start.';
}

/** Reply to 👎 feedback on a message that isn't a data answer, so there's no query to re-run. */
export function buildFeedbackReply(sourceName: string | null): string {
  return sourceName
    ? `Thanks, noted. Ask me a question about ${sourceName} and I'll answer it from the data.`
    : 'Thanks, noted. Create or import a data source and I can answer questions from it.';
}

export function buildEditIterationReply(): string {
  return "I'm applying that to the data source. Watch the preview — changes stay there and don't need a save.";
}

/** Empty agent: no sources yet and no conversation, so show import / create instead of chat. */
export function shouldShowAgentEntry(hasSources: boolean, itemCount: number): boolean {
  return !hasSources && itemCount === 0;
}

export function buildImportAcknowledgement(sourceName: string): string {
  const name = sourceName.trim();
  if (!name) return 'Your data source is in the workspace. Ask me anything about it.';
  return `${name} is in the workspace. Ask me anything about it.`;
}

export const STARTER_PROMPTS: string[] = [
  'I need a data source for marketing campaigns',
  'What can you help me with?',
];

let itemCounter = 0;
function nextId(): string {
  itemCounter += 1;
  return `flow-item-${itemCounter}`;
}

function assistantText(text: string): FlowItem {
  return { id: nextId(), kind: 'assistant-text', text };
}

function userText(text: string, certifiedId?: string): FlowItem {
  return { id: nextId(), kind: 'user-text', text, certifiedId };
}

function setupSummary(setup: DataSourceSetup): FlowItem {
  return { id: nextId(), kind: 'setup-summary', setup };
}

function agentRun(connectionName: string): FlowItem {
  return { id: nextId(), kind: 'agent-run', run: { connectionName, running: true } };
}

function answerItem(answer: DataAnswer, certifiedId?: string): FlowItem {
  return { id: nextId(), kind: 'assistant-text', text: answer.text, answer, certifiedId };
}

/** Re-runs the certified query: fresh narrative, saved summary and SQL. */
export function answerFromCertified(question: CertifiedQuestion, source: AnswerSource): DataAnswer {
  return {
    ...buildDataAnswer(question.question, source),
    summary: question.summary,
    sql: question.sql,
  };
}

export function useDataSourceFlow() {
  const items: Ref<FlowItem[]> = ref([]);
  const isWizardOpen = ref(false);
  const suggestedQuestions = ref<string[]>([]);
  const latestSetup = ref<DataSourceSetup | null>(null);

  const hasDataSource = computed(() => latestSetup.value !== null);
  const isAgentRunning = computed(() =>
    items.value.some((item) => item.kind === 'agent-run' && item.run?.running),
  );
  const showStarterPrompts = computed(() => items.value.length === 0);

  /** Starts with an empty thread: the entry screen and the wizard both rely on it. */
  function start(): void {
    items.value = [];
    isWizardOpen.value = false;
    suggestedQuestions.value = [];
    latestSetup.value = null;
  }

  function openWizard(): void {
    isWizardOpen.value = true;
  }

  function cancelWizard(): void {
    if (!isWizardOpen.value) return;
    isWizardOpen.value = false;
    if (items.value.length === 0) return;
    items.value.push(
      assistantText('No problem, I closed the setup. Mention a data source when you want to retry.'),
    );
  }

  /** Notes an imported source in the thread so chat can start without a wizard run. */
  function acknowledgeImport(sourceName: string): void {
    if (items.value.length > 0 || isAgentRunning.value) return;
    items.value.push(assistantText(buildImportAcknowledgement(sourceName)));
  }

  /** Called when the modal finishes all three steps. */
  function completeWizard(setup: DataSourceSetup): void {
    isWizardOpen.value = false;
    latestSetup.value = setup;
    suggestedQuestions.value = [];
    items.value.push(setupSummary(setup));
    items.value.push(assistantText(buildAgentStartMessage(setup)));
    items.value.push(agentRun(setup.connection.name));
  }

  /**
   * Called when the thinking panel of a given run finishes its sequence.
   * Returns true only for the transition, so callers can react once.
   */
  function completeAgentRun(itemId: string): boolean {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item?.run?.running || !latestSetup.value) return false;
    const setup = latestSetup.value;
    item.run.running = false;
    items.value.push(assistantText(buildCompletionMessage(setup)));
    suggestedQuestions.value = buildSuggestedQuestions(setup.tableConfig);
    return true;
  }

  function sendFreeText(rawText: string, context: SendContext = {}): void {
    const text = rawText.trim();
    if (!text || isAgentRunning.value) return;
    suggestedQuestions.value = [];
    // Canvas and setup intents win, so only a plain data question reuses a certified answer.
    const answersData =
      !detectsUpdateIntent(text) && !detectsEditIntent(text) && !detectsDataSourceIntent(text);
    const certified = answersData && context.source ? (context.certified ?? null) : null;
    items.value.push(userText(text, certified?.id));

    if (detectsUpdateIntent(text)) {
      items.value.push(assistantText(buildUpdateReply(context.updateTarget ?? null)));
      return;
    }

    if (detectsEditIntent(text)) {
      items.value.push(assistantText(buildEditIterationReply()));
      return;
    }

    if (detectsDataSourceIntent(text)) {
      items.value.push(assistantText(buildIntentReply(hasDataSource.value)));
      openWizard();
      return;
    }

    if (context.source) {
      const answer = certified
        ? answerFromCertified(certified, context.source)
        : buildDataAnswer(text, context.source);
      items.value.push(answerItem(answer, certified?.id));
      return;
    }

    items.value.push(assistantText(buildFallbackReply(hasDataSource.value)));
  }

  /**
   * Thumbs-down follow-up: posts the request, then a re-run answer.
   * A certified answer is regenerated from scratch rather than reusing its saved query;
   * any other reply has no query, so the agent just acknowledges the feedback.
   */
  function refineAnswer(itemId: string, request: RefineRequest, source: AnswerSource | null): void {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item || isAgentRunning.value) return;
    suggestedQuestions.value = [];
    items.value.push(userText(buildRefineRequestText(request)));
    if (!item.answer) {
      items.value.push(assistantText(buildFeedbackReply(source?.name ?? null)));
      return;
    }
    const base = item.certifiedId && source ? buildDataAnswer(item.answer.question, source) : item.answer;
    items.value.push(answerItem(buildRefinedAnswer(base, request)));
  }

  start();

  return {
    items,
    isWizardOpen,
    suggestedQuestions,
    latestSetup,
    hasDataSource,
    isAgentRunning,
    showStarterPrompts,
    starterPrompts: STARTER_PROMPTS,
    connections: CONNECTIONS,
    schemas: SCHEMAS,
    start,
    openWizard,
    cancelWizard,
    completeWizard,
    completeAgentRun,
    acknowledgeImport,
    sendFreeText,
    refineAnswer,
  };
}
