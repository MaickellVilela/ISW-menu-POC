/**
 * Prototype "data answers": the agent replies to a data question with a narrative,
 * a one-line query summary and the SQL it ran, so the answer can be certified.
 * Everything here is canned and side-effect free.
 */

/** The source a question is asked against. */
export interface AnswerSource {
  id: string;
  name: string;
  /** Table labels from the source's canvas, e.g. "Marketing Campaigns". */
  tables: string[];
}

export interface DataAnswer {
  /** The question this answers; a refined answer keeps the original one. */
  question: string;
  text: string;
  summary: string;
  sql: string;
  sourceId: string;
  sourceName: string;
}

export type RefineReason = 'wrong-numbers' | 'misread' | 'missing-filter' | 'other';

export interface RefineRequest {
  reason: RefineReason;
  note: string;
}

export const REFINE_REASONS: { id: RefineReason; label: string }[] = [
  { id: 'wrong-numbers', label: 'Wrong numbers' },
  { id: 'misread', label: 'Misread my question' },
  { id: 'missing-filter', label: 'Missing a filter' },
  { id: 'other', label: 'Something else' },
];

const FALLBACK_TABLE = 'orders';

/** "Marketing Campaigns" → "marketing_campaigns". */
export function toSqlIdentifier(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sqlTables(source: AnswerSource): string[] {
  const tables = source.tables.map(toSqlIdentifier).filter(Boolean);
  return tables.length ? tables : [FALLBACK_TABLE];
}

interface CannedAnswer {
  pattern: RegExp;
  build: (match: RegExpMatchArray, source: AnswerSource) => Pick<DataAnswer, 'text' | 'summary' | 'sql'>;
}

const CANNED_ANSWERS: CannedAnswer[] = [
  {
    pattern: /\b(top|biggest|largest|best)\b.*\bcustomers?\b|\bcustomers?\b.*\border value\b/i,
    build: () => ({
      text:
        'Your top customers by total order value are C-1042 ($184,320 across 61 orders), C-0877 ($142,905 across 48 orders) and C-1310 ($128,410 across 52 orders). I returned the top 250, highest first.',
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
    }),
  },
  {
    pattern: /\bmonth(ly| over month)\b|\border (volume|trends?|history)\b|\bby period\b/i,
    build: () => ({
      text:
        'Order volume grew 8.4% month over month on average this year. July peaked at 4,812 orders and February was the low point at 3,190.',
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
    }),
  },
  {
    pattern: /\bsummari[sz]e\b/i,
    build: (_match, source) => {
      const [table] = sqlTables(source);
      return {
        text: `${source.name} has 48,210 rows in ${table}, covering orders from Jan 2, 2025 to Sep 30, 2026. Most rows carry a customer, an amount and a campaign.`,
        summary: `Counts rows in ${table} and finds the first and last order dates.`,
        sql: [
          'SELECT',
          '  COUNT(*)        AS row_count,',
          '  MIN(order_date) AS first_order,',
          '  MAX(order_date) AS last_order',
          `FROM ${table}`,
        ].join('\n'),
      };
    },
  },
  {
    pattern: /\bkey metrics in ([\w\s]+?)\??$/i,
    build: (match) => {
      const table = toSqlIdentifier(match[1] ?? FALLBACK_TABLE) || FALLBACK_TABLE;
      return {
        text: `The key metrics in ${table} are total amount ($6.2M), average order value ($128.60) and distinct customers (12,480).`,
        summary: `Sums the amount, averages it per order and counts distinct customers in ${table}.`,
        sql: [
          'SELECT',
          '  SUM(total_amount)           AS total_amount,',
          '  AVG(total_amount)           AS avg_order_value,',
          '  COUNT(DISTINCT customer_id) AS customers',
          `FROM ${table}`,
          'WHERE total_amount IS NOT NULL',
        ].join('\n'),
      };
    },
  },
  {
    pattern: /\bhow do ([\w\s]+?) and ([\w\s]+?) relate\b/i,
    build: (match) => {
      const left = toSqlIdentifier(match[1] ?? '') || FALLBACK_TABLE;
      const right = toSqlIdentifier(match[2] ?? '') || 'customers';
      return {
        text: `${left} and ${right} join on customer_id. 96% of ${left} rows find a match; the rest are guest checkouts.`,
        summary: `Left-joins ${left} to ${right} on customer_id and counts matched and unmatched rows.`,
        sql: [
          'SELECT',
          `  COUNT(*)             AS ${left}_rows,`,
          `  COUNT(r.customer_id) AS matched_rows`,
          `FROM ${left} l`,
          `LEFT JOIN ${right} r ON r.customer_id = l.customer_id`,
        ].join('\n'),
      };
    },
  },
  {
    pattern: /\bcampaigns?\b/i,
    build: () => ({
      text:
        'Summer Sale drove the most revenue ($412,800 from 2,140 customers), followed by Back to School ($298,450) and Loyalty Rewards ($187,200).',
      summary:
        'Sums attributed revenue and distinct customers per campaign, ignoring rows without a campaign. Returns the top 10.',
      sql: [
        'SELECT',
        '  campaign_name,',
        '  SUM(total_amount)           AS attributed_revenue,',
        '  COUNT(DISTINCT customer_id) AS customers',
        'FROM marketing_campaign_data',
        'WHERE campaign_name IS NOT NULL',
        'GROUP BY campaign_name',
        'ORDER BY attributed_revenue DESC',
        'LIMIT 10',
      ].join('\n'),
    }),
  },
];

function genericAnswer(question: string, source: AnswerSource): Pick<DataAnswer, 'text' | 'summary' | 'sql'> {
  const [table] = sqlTables(source);
  return {
    text: `I ran this against ${table} in ${source.name} and found 1,284 matching rows. The query is below if you want to check how I got there.`,
    summary: `Returns up to 250 rows from ${table} that answer "${question.replace(/[?.!]+$/, '')}".`,
    sql: ['SELECT *', `FROM ${table}`, 'LIMIT 250'].join('\n'),
  };
}

export function buildDataAnswer(question: string, source: AnswerSource): DataAnswer {
  const text = question.trim();
  let body: Pick<DataAnswer, 'text' | 'summary' | 'sql'> | null = null;
  for (const canned of CANNED_ANSWERS) {
    const match = text.match(canned.pattern);
    if (match) {
      body = canned.build(match, source);
      break;
    }
  }
  return {
    question: text,
    ...(body ?? genericAnswer(text, source)),
    sourceId: source.id,
    sourceName: source.name,
  };
}

const CLAUSE_AFTER_WHERE = /^(GROUP BY|HAVING|ORDER BY|LIMIT)\b/i;

/** Adds `condition` to the WHERE clause, creating one when the query has none. */
export function addSqlCondition(sql: string, condition: string): string {
  if (sql.includes(condition)) return sql;
  const lines = sql.split('\n');
  const whereIndex = lines.findIndex((line) => /^WHERE\b/i.test(line));
  if (whereIndex >= 0) {
    let insertAt = lines.findIndex((line, index) => index > whereIndex && CLAUSE_AFTER_WHERE.test(line));
    if (insertAt < 0) insertAt = lines.length;
    lines.splice(insertAt, 0, `  AND ${condition}`);
    return lines.join('\n');
  }
  const clauseIndex = lines.findIndex((line) => CLAUSE_AFTER_WHERE.test(line));
  const insertAt = clauseIndex < 0 ? lines.length : clauseIndex;
  lines.splice(insertAt, 0, `WHERE ${condition}`);
  return lines.join('\n');
}

interface Refinement {
  sql: (sql: string) => string;
  lead: string;
  summary: string;
}

const REFINEMENTS: Record<RefineReason, Refinement> = {
  'wrong-numbers': {
    sql: (sql) => addSqlCondition(sql, "status <> 'refunded'"),
    lead: 'I re-ran it excluding refunded orders, which were inflating the totals. The ranking held, but each total dropped by 3–6%.',
    summary: 'Excludes refunded orders.',
  },
  'missing-filter': {
    sql: (sql) => addSqlCondition(sql, "order_date >= DATE '2026-01-01'"),
    lead: 'I re-ran it for this year only, from Jan 1, 2026. The numbers are smaller but reflect current performance.',
    summary: 'Limited to orders since Jan 1, 2026.',
  },
  misread: {
    sql: (sql) => sql.replace(/COUNT\((?!DISTINCT)(\w+)\)/i, 'COUNT(DISTINCT $1)'),
    lead: 'Let me take another pass at what you asked. I now count distinct values instead of every row, so duplicates no longer skew the result.',
    summary: 'Counts distinct values instead of rows.',
  },
  other: {
    sql: (sql) => sql,
    lead: 'I re-ran it with your feedback.',
    summary: '',
  },
};

/** `fresh` skips a certified answer's saved query, so the reply says it ran a new one. */
export function buildRefinedAnswer(
  answer: DataAnswer,
  request: RefineRequest,
  options: { fresh?: boolean } = {},
): DataAnswer {
  const refinement = REFINEMENTS[request.reason];
  const note = request.note.trim();
  let sql = refinement.sql(answer.sql);
  if (note) sql = `-- Adjusted: ${note}\n${sql}`;

  const parts: string[] = [];
  if (options.fresh) parts.push('I skipped the certified answer and ran a fresh query.');
  parts.push(refinement.lead);
  if (note) parts.push(`I applied your note: "${note}".`);
  parts.push('Check the query to see what changed.');

  return {
    ...answer,
    text: parts.join(' '),
    summary: [answer.summary, refinement.summary].filter(Boolean).join(' '),
    sql,
  };
}

/** The user bubble a refine request shows in the thread, e.g. "Wrong numbers: exclude refunds". */
export function buildRefineRequestText(request: RefineRequest): string {
  const label = REFINE_REASONS.find((reason) => reason.id === request.reason)?.label ?? 'Refine';
  const note = request.note.trim();
  return note ? `${label}: ${note}` : label;
}
