<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { previewFields, type OutputFieldCandidate, type OutputPreview } from '~/composables/useDataSourceCanvas';

export type ExpressionEditorMode = 'derived-field' | 'custom-metric';

export interface ExpressionEditorDraft {
  id?: string;
  name: string;
  expression: string;
}

interface SqlOperation {
  name: string;
  signature: string;
  snippet: string;
  /** A leading glyph shown before the name. Falls back to the generic "fx" tag when absent. */
  symbol?: string;
}

/** Comparison operators — these have real, universally-recognized symbols. */
const RELATIONAL_OPERATORS: SqlOperation[] = [
  { name: 'Equal to', signature: 'leftoperand = rightoperand', snippet: ' = ', symbol: '=' },
  { name: 'Not equal to', signature: 'leftoperand <> rightoperand', snippet: ' <> ', symbol: '≠' },
  { name: 'Greater than', signature: 'leftoperand > rightoperand', snippet: ' > ', symbol: '>' },
  { name: 'Greater than or equal to', signature: 'leftoperand >= rightoperand', snippet: ' >= ', symbol: '≥' },
  { name: 'Less than', signature: 'leftoperand < rightoperand', snippet: ' < ', symbol: '<' },
  { name: 'Less than or equal to', signature: 'leftoperand <= rightoperand', snippet: ' <= ', symbol: '≤' },
];

/** Logical operators — also have well-known symbols. */
const LOGICAL_OPERATORS: SqlOperation[] = [
  { name: 'And', signature: 'condition AND condition', snippet: ' AND ', symbol: '∧' },
  { name: 'Or', signature: 'condition OR condition', snippet: ' OR ', symbol: '∨' },
  { name: 'Not', signature: 'NOT condition', snippet: 'NOT ', symbol: '¬' },
];

/** Per-row SQL functions — valid in both a Derived Field and a Custom Metric expression. */
const ROW_LEVEL_FUNCTIONS: SqlOperation[] = [
  { name: 'UPPER', signature: 'UPPER(text)', snippet: 'UPPER()' },
  { name: 'LOWER', signature: 'LOWER(text)', snippet: 'LOWER()' },
  { name: 'TRIM', signature: 'TRIM(text)', snippet: 'TRIM()' },
  { name: 'CONCAT', signature: 'CONCAT(text1, text2)', snippet: 'CONCAT(, )' },
  { name: 'SUBSTRING', signature: 'SUBSTRING(text, start, length)', snippet: 'SUBSTRING(, , )' },
  { name: 'ROUND', signature: 'ROUND(number, decimals)', snippet: 'ROUND(, 2)' },
  { name: 'ABS', signature: 'ABS(number)', snippet: 'ABS()' },
  { name: 'COALESCE', signature: 'COALESCE(value1, value2)', snippet: 'COALESCE(, )' },
  { name: 'CASE WHEN', signature: 'CASE WHEN condition THEN value ELSE value END', snippet: 'CASE WHEN  THEN  ELSE  END' },
  { name: 'DATEADD', signature: 'DATEADD(interval, number, date)', snippet: 'DATEADD(day, 1, )' },
  { name: 'DATEDIFF', signature: 'DATEDIFF(interval, date1, date2)', snippet: 'DATEDIFF(day, , )' },
];

/** Aggregate SQL functions — only valid across rows, so only offered for a Custom Metric. */
const AGGREGATE_FUNCTIONS: SqlOperation[] = [
  { name: 'SUM', signature: 'SUM(number)', snippet: 'SUM()' },
  { name: 'AVG', signature: 'AVG(number)', snippet: 'AVG()' },
  { name: 'COUNT', signature: 'COUNT(value)', snippet: 'COUNT()' },
  { name: 'COUNT DISTINCT', signature: 'COUNT(DISTINCT value)', snippet: 'COUNT(DISTINCT )' },
  { name: 'MIN', signature: 'MIN(value)', snippet: 'MIN()' },
  { name: 'MAX', signature: 'MAX(value)', snippet: 'MAX()' },
];

const TYPE_BADGE: Record<string, string> = { Attribute: 'ABC', Number: '123', Time: 'DATE' };

/** Individual keyword tokens a function's SQL might contain — highlighted like SUBSTRING/UPPER/etc. */
const HIGHLIGHT_KEYWORDS = ['CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IS', 'NULL', 'IN', 'LIKE', 'BETWEEN', 'DISTINCT', 'AS'];
/** Function names recognized by the highlighter, built from every catalog entry (minus multi-word phrases already covered by keywords). */
const HIGHLIGHT_FUNCTIONS = [...ROW_LEVEL_FUNCTIONS, ...AGGREGATE_FUNCTIONS]
  .map((op) => op.name)
  .filter((name) => !name.includes(' '));

const SQL_TOKEN_PATTERN = /('(?:[^']|'')*')|("(?:[^"]|"")*")|(\d+(?:\.\d+)?)|(<>|!=|>=|<=)|([=<>+\-*/%])|([(),])|([A-Za-z_][A-Za-z0-9_]*)/g;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Tokenizes SQL-ish text into highlighted spans: keywords, our catalog functions, operators, strings, numbers, quoted identifiers. */
function highlightSql(text: string): string {
  const functionSet = new Set(HIGHLIGHT_FUNCTIONS.map((name) => name.toUpperCase()));
  const keywordSet = new Set(HIGHLIGHT_KEYWORDS);
  let output = '';
  let lastIndex = 0;
  SQL_TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SQL_TOKEN_PATTERN.exec(text))) {
    output += escapeHtml(text.slice(lastIndex, match.index));
    const [, stringLit, quotedIdent, number, multiOp, singleOp, punct, word] = match;
    if (stringLit) output += `<span class="text-[#1A7F37]">${escapeHtml(stringLit)}</span>`;
    else if (quotedIdent) output += `<span class="text-[#0B5A8C]">${escapeHtml(quotedIdent)}</span>`;
    else if (number) output += `<span class="text-[#9A5B13]">${escapeHtml(number)}</span>`;
    else if (multiOp || singleOp) output += `<span class="font-semibold text-[#C81E1E]">${escapeHtml(multiOp ?? singleOp)}</span>`;
    else if (punct) output += escapeHtml(punct);
    else if (word) {
      const upper = word.toUpperCase();
      if (keywordSet.has(upper)) output += `<span class="font-semibold text-[#3B1770]">${escapeHtml(word)}</span>`;
      else if (functionSet.has(upper)) output += `<span class="font-semibold text-[#0F6FA6]">${escapeHtml(word)}</span>`;
      else output += escapeHtml(word);
    }
    lastIndex = SQL_TOKEN_PATTERN.lastIndex;
  }
  output += escapeHtml(text.slice(lastIndex));
  return output;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: ExpressionEditorMode;
    fieldOptions?: OutputFieldCandidate[];
    editing?: ExpressionEditorDraft | null;
  }>(),
  { fieldOptions: () => [], editing: undefined },
);

const emit = defineEmits<{
  cancel: [];
  'save-derived-field': [payload: { id?: string; name: string; expression: string }];
  'save-custom-metric': [payload: { id?: string; name: string; expression: string }];
}>();

const name = ref('');
const expression = ref('');
const paletteQuery = ref('');
const preview = ref<OutputPreview>({ columns: [], rows: [], sourceLabel: '' });
const expressionInput = ref<HTMLTextAreaElement | null>(null);
const highlightLayer = ref<HTMLElement | null>(null);

const title = computed(() => (props.mode === 'derived-field' ? 'Derived Field Editor' : 'Custom Metrics Editor'));
const canSave = computed(() => name.value.trim() !== '' && expression.value.trim() !== '');
const highlightedExpression = computed(() => `${highlightSql(expression.value)}\n`);

function matches(text: string): boolean {
  const needle = paletteQuery.value.trim().toLowerCase();
  return !needle || text.toLowerCase().includes(needle);
}

const visibleRelationalOperators = computed(() => RELATIONAL_OPERATORS.filter((op) => matches(op.name)));
const visibleLogicalOperators = computed(() => LOGICAL_OPERATORS.filter((op) => matches(op.name)));
const visibleAggregateFunctions = computed(() =>
  props.mode === 'custom-metric' ? AGGREGATE_FUNCTIONS.filter((op) => matches(op.name)) : [],
);
const visibleRowFunctions = computed(() => ROW_LEVEL_FUNCTIONS.filter((op) => matches(op.name)));
const visibleFields = computed(() => props.fieldOptions.filter((field) => matches(field.name)));

function reset(): void {
  name.value = props.editing?.name ?? '';
  expression.value = props.editing?.expression ?? '';
  paletteQuery.value = '';
  preview.value = { columns: [], rows: [], sourceLabel: '' };
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    reset();
    await nextTick();
    expressionInput.value?.focus();
  },
);

/** Quotes a SQL identifier only when it isn't already a plain, unquoted-safe name. */
function sqlIdentifier(part: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(part) ? part : `"${part.replace(/"/g, '""')}"`;
}

function syncHighlightScroll(): void {
  if (highlightLayer.value && expressionInput.value) {
    highlightLayer.value.scrollTop = expressionInput.value.scrollTop;
    highlightLayer.value.scrollLeft = expressionInput.value.scrollLeft;
  }
}

function insertAtCursor(token: string): void {
  const el = expressionInput.value;
  if (el && document.activeElement === el) {
    const start = el.selectionStart ?? expression.value.length;
    const end = el.selectionEnd ?? expression.value.length;
    expression.value = expression.value.slice(0, start) + token + expression.value.slice(end);
    void nextTick(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
      syncHighlightScroll();
    });
  } else {
    expression.value = expression.value ? `${expression.value} ${token}` : token;
  }
}

function insertField(candidate: OutputFieldCandidate): void {
  insertAtCursor(candidate.value.split('.').map(sqlIdentifier).join('.'));
}

function insertOperation(operation: SqlOperation): void {
  insertAtCursor(operation.snippet);
}

function run(): void {
  const columnName = name.value.trim() || 'Result';
  preview.value = previewFields(
    [{ value: columnName, name: columnName, type: 'Attribute', entity: '' }],
    columnName,
    5,
  );
}

function save(): void {
  if (!canSave.value) return;
  const payload = { id: props.editing?.id, name: name.value.trim(), expression: expression.value.trim() };
  if (props.mode === 'derived-field') emit('save-derived-field', payload);
  else emit('save-custom-metric', payload);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <section
        class="flex max-h-[85vh] w-[min(56rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expression-editor-title"
      >
        <header class="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <h2 id="expression-editor-title" class="text-lg font-semibold text-[#25262E]">{{ title }}</h2>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] outline-none hover:bg-[#F3F3F4] hover:text-[#25262E] focus-visible:ring-2 focus-visible:ring-[#6F42A5]"
            aria-label="Close"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-3 sm:flex-row sm:overflow-hidden">
          <!-- Editor -->
          <div class="min-w-0 flex-1 space-y-3 sm:overflow-y-auto sm:pr-1">
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Name<span class="text-[#C62828]">*</span></span>
              <input
                v-model="name"
                type="text"
                :placeholder="mode === 'derived-field' ? 'e.g. full_name' : 'e.g. Total Revenue'"
                class="h-9 w-full rounded-md border border-[#D8D8D8] bg-white px-2.5 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
              />
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-medium text-[#52525B]">Expression (SQL)<span class="text-[#C62828]">*</span></span>
              <div class="relative rounded-md border border-[#D8D8D8] bg-[#FAFAFA] focus-within:border-[#3B1770]">
                <pre
                  ref="highlightLayer"
                  aria-hidden="true"
                  class="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-xs leading-relaxed text-[#25262E]"
                ><code v-html="highlightedExpression" /></pre>
                <textarea
                  ref="expressionInput"
                  v-model="expression"
                  rows="5"
                  spellcheck="false"
                  placeholder="e.g. UPPER(customer_name)"
                  class="relative w-full resize-none whitespace-pre-wrap break-words bg-transparent px-2.5 py-2 font-mono text-xs leading-relaxed text-transparent caret-[#25262E] outline-none placeholder:text-[#9A9A9A]"
                  @scroll="syncHighlightScroll"
                />
              </div>
            </label>

            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-[#52525B]">Preview</span>
              <button
                type="button"
                class="rounded-md border border-[#C9CED6] bg-white px-3 py-1 text-xs font-medium text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
                @click="run"
              >
                Run
              </button>
            </div>
            <div class="overflow-auto rounded-md border border-[#E2E2E2]">
              <table v-if="preview.columns.length > 0" class="min-w-full text-left">
                <thead>
                  <tr>
                    <th
                      v-for="column in preview.columns"
                      :key="column"
                      class="whitespace-nowrap border-b border-[#EAEAEA] bg-[#FAFAFA] px-2 py-1.5 text-[10px] font-semibold text-[#52525B]"
                    >
                      {{ column }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in preview.rows" :key="index">
                    <td
                      v-for="column in preview.columns"
                      :key="column"
                      class="max-w-[10rem] truncate px-2 py-1 text-[11px] text-[#3F3F46]"
                    >
                      {{ row[column] }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="px-2 py-4 text-center text-[11px] text-[#7A7A7A]">No data available. Click Run to preview.</p>
            </div>
          </div>

          <!-- Expression builder palette -->
          <div class="flex min-h-0 w-full flex-shrink-0 flex-col gap-2 border-t border-[#EAEAEA] pt-3 sm:w-56 sm:overflow-y-auto sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <label class="relative block flex-shrink-0">
              <span class="sr-only">Search fields and operations</span>
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
              <input
                v-model="paletteQuery"
                type="search"
                placeholder="Search fields and operations"
                class="h-8 w-full rounded-md border border-[#D8D8D8] bg-white py-1 pl-8 pr-2 text-xs text-[#25262E] outline-none focus:border-[#3B1770]"
              />
            </label>

            <div v-if="visibleRelationalOperators.length > 0">
              <span class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Relational</span>
              <div class="space-y-0.5">
                <button
                  v-for="op in visibleRelationalOperators"
                  :key="op.name"
                  type="button"
                  :title="op.signature"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-[#25262E] hover:bg-[#F5F1FC]"
                  @click="insertOperation(op)"
                >
                  <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF0F3] text-[10px] font-semibold text-[#52525B]">{{ op.symbol }}</span>
                  <span class="truncate">{{ op.name }}</span>
                </button>
              </div>
            </div>

            <div v-if="visibleLogicalOperators.length > 0">
              <span class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Logical</span>
              <div class="space-y-0.5">
                <button
                  v-for="op in visibleLogicalOperators"
                  :key="op.name"
                  type="button"
                  :title="op.signature"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-[#25262E] hover:bg-[#F5F1FC]"
                  @click="insertOperation(op)"
                >
                  <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF0F3] text-[10px] font-semibold text-[#52525B]">{{ op.symbol }}</span>
                  <span class="truncate">{{ op.name }}</span>
                </button>
              </div>
            </div>

            <div v-if="visibleAggregateFunctions.length > 0">
              <span class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Function Library</span>
              <div class="space-y-0.5">
                <button
                  v-for="op in visibleAggregateFunctions"
                  :key="op.name"
                  type="button"
                  :title="op.signature"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-[#25262E] hover:bg-[#F5F1FC]"
                  @click="insertOperation(op)"
                >
                  <span class="flex-shrink-0 rounded-full bg-[#FBEFE0] px-1.5 py-0 text-[9px] font-semibold text-[#9A5B13]">fx</span>
                  <span class="truncate font-mono">{{ op.name }}</span>
                </button>
              </div>
            </div>

            <div v-if="visibleRowFunctions.length > 0">
              <span class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Row Level Functions</span>
              <div class="space-y-0.5">
                <button
                  v-for="op in visibleRowFunctions"
                  :key="op.name"
                  type="button"
                  :title="op.signature"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-[#25262E] hover:bg-[#F5F1FC]"
                  @click="insertOperation(op)"
                >
                  <span class="flex-shrink-0 rounded-full bg-[#EEF0F3] px-1.5 py-0 text-[9px] font-semibold text-[#52525B]">fx</span>
                  <span class="truncate font-mono">{{ op.name }}</span>
                </button>
              </div>
            </div>

            <div v-if="visibleFields.length > 0">
              <span class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">Fields</span>
              <div class="space-y-0.5">
                <button
                  v-for="field in visibleFields"
                  :key="field.value"
                  type="button"
                  class="flex w-full items-center justify-between gap-1.5 rounded-md px-2 py-1 text-left text-xs text-[#25262E] hover:bg-[#F5F1FC]"
                  @click="insertField(field)"
                >
                  <span class="truncate">{{ field.name }}</span>
                  <span class="flex-shrink-0 rounded-full bg-[#F1ECFA] px-1.5 py-0 text-[9px] font-semibold text-[#3B1770]">{{ TYPE_BADGE[field.type] ?? field.type }}</span>
                </button>
              </div>
            </div>

            <p
              v-if="visibleRelationalOperators.length === 0 && visibleLogicalOperators.length === 0 && visibleAggregateFunctions.length === 0 && visibleRowFunctions.length === 0 && visibleFields.length === 0"
              class="px-2 py-4 text-center text-[11px] text-[#7A7A7A]"
            >
              No matches.
            </p>
          </div>
        </div>

        <footer class="mt-1 flex flex-shrink-0 justify-end gap-2 border-t border-[#E2E2E2] px-5 py-3">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[#3B1770] px-4 py-2 text-sm font-medium text-white hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:bg-[#C9CED6]"
            :disabled="!canSave"
            @click="save"
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
