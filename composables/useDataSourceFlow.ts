import { ref, computed, type Ref } from 'vue';

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
}

// --- Pure helpers (side-effect free so they can be unit tested) ---

const DATA_SOURCE_INTENT = /\bdata[\s_-]?sources?\b/i;

/** Simulated intent recognition: the agent offers the modal when a data source is mentioned. */
export function detectsDataSourceIntent(text: string): boolean {
  return DATA_SOURCE_INTENT.test(text);
}

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

export const GREETING =
  'Hi, I\u2019m Simba. I can build data sources for this workspace and answer questions about them. Tell me what you need \u2014 for example, "I need a data source for marketing campaigns".';

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

function userText(text: string): FlowItem {
  return { id: nextId(), kind: 'user-text', text };
}

function setupSummary(setup: DataSourceSetup): FlowItem {
  return { id: nextId(), kind: 'setup-summary', setup };
}

function agentRun(connectionName: string): FlowItem {
  return { id: nextId(), kind: 'agent-run', run: { connectionName, running: true } };
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
  const showStarterPrompts = computed(() => items.value.length === 1);

  function start(): void {
    items.value = [assistantText(GREETING)];
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
    items.value.push(
      assistantText('No problem, I closed the setup. Mention a data source when you want to retry.'),
    );
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

  /** Called when the thinking panel of a given run finishes its sequence. */
  function completeAgentRun(itemId: string): void {
    const item = items.value.find((entry) => entry.id === itemId);
    if (!item?.run?.running || !latestSetup.value) return;
    const setup = latestSetup.value;
    item.run.running = false;
    items.value.push(assistantText(buildCompletionMessage(setup)));
    suggestedQuestions.value = buildSuggestedQuestions(setup.tableConfig);
  }

  function sendFreeText(rawText: string): void {
    const text = rawText.trim();
    if (!text || isAgentRunning.value) return;
    suggestedQuestions.value = [];
    items.value.push(userText(text));

    if (detectsDataSourceIntent(text)) {
      items.value.push(assistantText(buildIntentReply(hasDataSource.value)));
      openWizard();
      return;
    }

    items.value.push(assistantText(buildFallbackReply(hasDataSource.value)));
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
    sendFreeText,
  };
}
