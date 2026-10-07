import { computed, ref } from 'vue';

/** Most associated phrasings a certified question can hold. */
export const MAX_PHRASINGS = 5;

/** No user model in this POC: everything the current user certifies or edits is "You". */
export const CURRENT_AUTHOR = 'You';

export interface CertifiedQuestion {
  id: string;
  sourceId: string;
  question: string;
  phrasings: string[];
  summary: string;
  sql: string;
  comment: string;
  createdBy: string;
  /** ISO timestamp. */
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export type CertifyDraft = Pick<
  CertifiedQuestion,
  'sourceId' | 'question' | 'phrasings' | 'summary' | 'sql' | 'comment'
>;

export type CertifiedQuestionPatch = Partial<
  Pick<CertifiedQuestion, 'question' | 'phrasings' | 'summary' | 'sql' | 'comment'>
>;

// --- Pure helpers (side-effect free so they can be unit tested) ---

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'me', 'my', 'our', 'we', 'us', 'i', 'you', 'is', 'are', 'was', 'were',
  'what', 'which', 'who', 'how', 'has', 'have', 'had', 'do', 'does', 'did', 'show', 'give',
  'tell', 'list', 'see', 'can', 'could', 'would', 'please', 'of', 'by', 'to', 'for', 'in',
  'on', 'at', 'look', 'like',
]);

/** Similarity a question needs to reuse a certified answer. */
export const MATCH_THRESHOLD = 0.75;

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentTokens(text: string): Set<string> {
  return new Set(
    normalizeQuestion(text)
      .split(' ')
      .filter((word) => word && !STOP_WORDS.has(word)),
  );
}

function similarity(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/** Exact match on the question or a phrasing first, then the closest one above the threshold. */
export function findCertifiedMatch(
  questions: CertifiedQuestion[],
  sourceId: string,
  text: string,
): CertifiedQuestion | null {
  const target = normalizeQuestion(text);
  if (!target) return null;
  const candidates = questions.filter((question) => question.sourceId === sourceId);

  const exact = candidates.find((question) =>
    [question.question, ...question.phrasings].some((phrase) => normalizeQuestion(phrase) === target),
  );
  if (exact) return exact;

  const targetTokens = contentTokens(text);
  let best: CertifiedQuestion | null = null;
  let bestScore = MATCH_THRESHOLD;
  for (const question of candidates) {
    for (const phrase of [question.question, ...question.phrasings]) {
      const score = similarity(targetTokens, contentTokens(phrase));
      if (score >= bestScore) {
        best = question;
        bestScore = score;
      }
    }
  }
  return best;
}

const CANNED_PHRASINGS: { pattern: RegExp; phrasings: string[] }[] = [
  {
    pattern: /\bcustomers?\b/i,
    phrasings: [
      'Who are our biggest customers?',
      'Rank customers by total spend',
      'Which customers have the highest order value?',
      'Show me the top buyers by revenue',
      'List customers by lifetime order value',
    ],
  },
  {
    pattern: /\bmonth(ly| over month)\b|\border volume\b/i,
    phrasings: [
      'Show me monthly order trends',
      'What does the order history look like?',
      'Give me a revenue breakdown by period',
      'How many orders did we get each month?',
      'Is order volume growing or shrinking?',
    ],
  },
  {
    pattern: /\bcampaigns?\b/i,
    phrasings: [
      'Which campaigns made the most money?',
      'Rank campaigns by revenue',
      'What are our best performing campaigns?',
      'Show me revenue by campaign',
      'Which marketing campaign drove the most sales?',
    ],
  },
];

const LEADING_WORDS =
  /^((what|which|who|how|when|where)\s+(are|is|was|were|do|does|did|has|have|had)\s+|(show me|give me|tell me|can you|could you|please)\s+)/i;

function templatePhrasings(question: string): string[] {
  const core = question.trim().replace(/[?.!]+$/, '').replace(LEADING_WORDS, '');
  if (!core) return [];
  return [
    `Show me ${core}`,
    `Give me ${core}`,
    `Break down ${core}`,
    `Can you list ${core}?`,
    `I'd like to see ${core}`,
  ];
}

/** Five ways to ask `question`, skipping the question itself and phrasings it already has. */
export function buildPhrasingSuggestions(question: string, existing: string[] = []): string[] {
  const taken = new Set([question, ...existing].map(normalizeQuestion));
  const canned = CANNED_PHRASINGS.find((entry) => entry.pattern.test(question))?.phrasings ?? [];
  const suggestions: string[] = [];
  for (const phrase of [...canned, ...templatePhrasings(question)]) {
    const key = normalizeQuestion(phrase);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    suggestions.push(phrase);
    if (suggestions.length === MAX_PHRASINGS) break;
  }
  return suggestions;
}

export function canAddPhrasing(phrasings: string[]): boolean {
  return phrasings.length < MAX_PHRASINGS;
}

// --- Shared store: one list for the whole app, like the live catalog ---

const SEEDED_QUESTIONS: CertifiedQuestion[] = [
  {
    id: 'cq-seed-top-customers',
    sourceId: 'seed-order-items',
    question: 'What are the top customers by order value?',
    phrasings: ['Who are our biggest customers?', 'Rank customers by total spend'],
    summary:
      'Returns the top customers ranked by total order value, filtering out null amounts. Groups by customer_id and limits to 250 results.',
    sql: [
      'SELECT',
      '  customer_id,',
      '  SUM(total_amount) AS total_order_value,',
      '  COUNT(order_id)   AS order_count',
      'FROM marketing_campaign_data',
      'WHERE',
      '  total_amount IS NOT NULL',
      '  AND order_id IS NOT NULL',
      'GROUP BY customer_id',
      'ORDER BY total_order_value DESC',
      'LIMIT 250',
    ].join('\n'),
    comment: 'Order value is gross: refunds are not netted out. Use the Finance source for net revenue.',
    createdBy: 'Sarah Chen',
    createdAt: '2026-08-02T15:10:00.000Z',
    updatedBy: 'Sarah Chen',
    updatedAt: '2026-08-14T16:45:00.000Z',
  },
  {
    id: 'cq-seed-monthly-volume',
    sourceId: 'seed-order-items',
    question: 'How has order volume changed month over month?',
    phrasings: [
      'Show me monthly order trends',
      'What does the order history look like?',
      'Give me a revenue breakdown by period',
    ],
    summary:
      'Counts orders and sums revenue per calendar month, skipping orders without a date. Sorted oldest to newest.',
    sql: [
      'SELECT',
      "  DATE_TRUNC('month', order_date) AS order_month,",
      '  COUNT(order_id)                 AS order_count,',
      '  SUM(total_amount)               AS revenue',
      'FROM orders',
      'WHERE order_date IS NOT NULL',
      'GROUP BY order_month',
      'ORDER BY order_month',
    ].join('\n'),
    comment: '',
    createdBy: 'James Park',
    createdAt: '2026-08-11T10:05:00.000Z',
    updatedBy: null,
    updatedAt: null,
  },
];

const certifiedQuestions = ref<CertifiedQuestion[]>(
  SEEDED_QUESTIONS.map((question) => ({ ...question, phrasings: [...question.phrasings] })),
);

let questionSeq = 0;
function nextQuestionId(): string {
  questionSeq += 1;
  return `cq-${questionSeq}`;
}

export function useCertifiedQuestions() {
  const questions = computed(() => certifiedQuestions.value);

  function questionsFor(sourceId: string | null): CertifiedQuestion[] {
    if (!sourceId) return [];
    return certifiedQuestions.value.filter((question) => question.sourceId === sourceId);
  }

  function findQuestion(id: string): CertifiedQuestion | undefined {
    return certifiedQuestions.value.find((question) => question.id === id);
  }

  function certify(draft: CertifyDraft): CertifiedQuestion {
    const question: CertifiedQuestion = {
      ...draft,
      id: nextQuestionId(),
      question: draft.question.trim(),
      phrasings: draft.phrasings.slice(0, MAX_PHRASINGS),
      comment: draft.comment.trim(),
      createdBy: CURRENT_AUTHOR,
      createdAt: new Date().toISOString(),
      updatedBy: null,
      updatedAt: null,
    };
    certifiedQuestions.value = [...certifiedQuestions.value, question];
    return question;
  }

  /** Applies `patch` and stamps the current user as the last editor. */
  function updateQuestion(id: string, patch: CertifiedQuestionPatch): void {
    certifiedQuestions.value = certifiedQuestions.value.map((question) =>
      question.id === id
        ? { ...question, ...patch, updatedBy: CURRENT_AUTHOR, updatedAt: new Date().toISOString() }
        : question,
    );
  }

  /** False when the list is full or the phrasing is already there. */
  function addPhrasing(id: string, text: string): boolean {
    const question = findQuestion(id);
    const phrase = text.trim();
    if (!question || !phrase || !canAddPhrasing(question.phrasings)) return false;
    const key = normalizeQuestion(phrase);
    const taken = [question.question, ...question.phrasings].some((item) => normalizeQuestion(item) === key);
    if (taken) return false;
    updateQuestion(id, { phrasings: [...question.phrasings, phrase] });
    return true;
  }

  function removePhrasing(id: string, index: number): void {
    const question = findQuestion(id);
    if (!question) return;
    updateQuestion(id, { phrasings: question.phrasings.filter((_, position) => position !== index) });
  }

  function removeQuestion(id: string): void {
    certifiedQuestions.value = certifiedQuestions.value.filter((question) => question.id !== id);
  }

  return {
    questions,
    questionsFor,
    findQuestion,
    certify,
    updateQuestion,
    addPhrasing,
    removePhrasing,
    removeQuestion,
  };
}
