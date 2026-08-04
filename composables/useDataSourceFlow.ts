import { ref, computed, type Ref } from 'vue';

export type FlowStepId = 'use-case' | 'connection' | 'configuration';

export interface UseCasePayload {
  description: string;
  fileName: string | null;
}

export interface ConnectionOption {
  id: string;
  name: string;
  /** Engine label, e.g. "PostgreSQL". Empty for the "new connection" tile. */
  type: string;
  kind: 'database' | 'new';
}

export interface SchemaOption {
  name: string;
  tableCount: number;
}

export interface TableConfigPayload {
  schema: string;
  tables: string[];
}

/** Mock connections mirroring the classic connection picker. */
export const CONNECTIONS: ConnectionOption[] = [
  { id: 'new', name: 'New connection', type: '', kind: 'new' },
  { id: 'marketing', name: 'Marketing data', type: 'PostgreSQL', kind: 'database' },
  { id: 'healthcare', name: 'Healthcare data', type: 'PostgreSQL', kind: 'database' },
  { id: 'snowflake', name: 'Snowflake', type: 'Snowflake', kind: 'database' },
];

export const SCHEMAS: SchemaOption[] = [{ name: 'public', tableCount: 5 }];

export const TABLES: string[] = [
  'customers',
  'marketing_campaigns',
  'order_items',
  'orders',
  'products',
];

/** Recommended table ceiling before agent quality degrades. */
export const RECOMMENDED_TABLE_LIMIT = 5;

export interface RecapContent {
  title: string;
  lines: string[];
}

export type FlowItemKind = 'assistant-text' | 'user-text' | 'user-recap';

export interface FlowItem {
  id: string;
  kind: FlowItemKind;
  text?: string;
  recap?: RecapContent;
}

// --- Pure builders (kept side-effect free for unit testing) ---

export function buildUseCaseRecap(payload: UseCasePayload): RecapContent {
  const lines = [payload.description.trim()];
  if (payload.fileName) lines.push(`Attached: ${payload.fileName}`);
  return { title: 'Use case', lines };
}

export function buildConnectionRecap(connection: ConnectionOption): RecapContent {
  const line =
    connection.kind === 'new'
      ? 'New connection'
      : `${connection.name} · ${connection.type}`;
  return { title: 'Connection', lines: [line] };
}

export function buildTableConfigRecap(payload: TableConfigPayload): RecapContent {
  return {
    title: 'Tables',
    lines: [`${payload.schema}: ${payload.tables.join(', ')}`],
  };
}

export function buildCompletionMessage(
  connection: ConnectionOption,
  payload: TableConfigPayload,
): string {
  const count = payload.tables.length;
  const noun = count === 1 ? 'table' : 'tables';
  return `Your data source is ready. I assessed ${count} ${noun} from ${connection.name}. Ask me anything about it.`;
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

function userRecap(recap: RecapContent): FlowItem {
  return { id: nextId(), kind: 'user-recap', recap };
}

const INTRO =
  'Let\u2019s create a data source. Describe the business use case, and attach any files that add context.';

/** Simulated time to "build" the data source before it becomes queryable. */
export const CREATE_DELAY_MS = 1800;

export interface UseDataSourceFlowOptions {
  /** Override the creation delay; set to 0 in tests. */
  createDelayMs?: number;
}

export function useDataSourceFlow(options: UseDataSourceFlowOptions = {}) {
  const createDelayMs = options.createDelayMs ?? CREATE_DELAY_MS;

  const items: Ref<FlowItem[]> = ref([]);
  const activeStep = ref<FlowStepId | null>(null);
  const isCreating = ref(false);
  const isComplete = ref(false);
  const suggestedQuestions = ref<string[]>([]);

  const useCase = ref<UseCasePayload | null>(null);
  const connection = ref<ConnectionOption | null>(null);
  const tableConfig = ref<TableConfigPayload | null>(null);

  const connectionName = computed(() => connection.value?.name ?? '');
  const hasFreeText = computed(() =>
    items.value.some((item) => item.kind === 'user-text'),
  );

  function start(): void {
    items.value = [assistantText(INTRO)];
    activeStep.value = 'use-case';
    isCreating.value = false;
    isComplete.value = false;
    suggestedQuestions.value = [];
    useCase.value = null;
    connection.value = null;
    tableConfig.value = null;
  }

  function submitUseCase(payload: UseCasePayload): void {
    if (activeStep.value !== 'use-case') return;
    useCase.value = payload;
    items.value.push(userRecap(buildUseCaseRecap(payload)));
    items.value.push(assistantText('Select a connection, or create a new one.'));
    activeStep.value = 'connection';
  }

  function selectConnection(option: ConnectionOption): void {
    if (activeStep.value !== 'connection') return;
    connection.value = option;
    items.value.push(userRecap(buildConnectionRecap(option)));
    items.value.push(
      assistantText(
        'Select the tables the agent should assess. Five or fewer works best.',
      ),
    );
    activeStep.value = 'configuration';
  }

  function submitTableConfig(payload: TableConfigPayload): void {
    if (activeStep.value !== 'configuration') return;
    tableConfig.value = payload;
    items.value.push(userRecap(buildTableConfigRecap(payload)));
    activeStep.value = null;
    isCreating.value = true;

    window.setTimeout(() => {
      items.value.push(assistantText(buildCompletionMessage(connection.value!, payload)));
      suggestedQuestions.value = buildSuggestedQuestions(payload);
      isCreating.value = false;
      isComplete.value = true;
    }, createDelayMs);
  }

  function sendFreeText(rawText: string): void {
    const text = rawText.trim();
    if (!text || !isComplete.value) return;
    items.value.push(userText(text));
    items.value.push(
      assistantText('Noted. Refine the data source, or start a new one.'),
    );
  }

  start();

  return {
    items,
    activeStep,
    isCreating,
    isComplete,
    suggestedQuestions,
    hasFreeText,
    useCase,
    connection,
    tableConfig,
    connectionName,
    connections: CONNECTIONS,
    schemas: SCHEMAS,
    tables: TABLES,
    start,
    submitUseCase,
    selectConnection,
    submitTableConfig,
    sendFreeText,
  };
}
