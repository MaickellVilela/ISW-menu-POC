<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';

export type ThinkingStepStatus = 'pending' | 'active' | 'completed';

export interface ThinkingSection {
  title: string;
  body?: string;
}

export interface ThinkingFieldNote {
  name: string;
  detail: string;
}

export interface ThinkingStepContent {
  /** Free-form paragraphs / bullets shown above sections. */
  paragraphs?: string[];
  /** Inline code tokens to highlight inside paragraphs. */
  codeTokens?: string[];
  sections?: ThinkingSection[];
  /** Structured "Formatted Columns" style block. */
  formattedColumns?: {
    intro: string;
    fields: ThinkingFieldNote[];
  };
}

export interface ThinkingStepDef {
  id: string;
  title: string;
  content?: ThinkingStepContent;
}

const props = defineProps<{
  connectionName: string;
  connectionId?: string;
  /** When true, animate through steps then emit completed. */
  running: boolean;
}>();

const emit = defineEmits<{
  completed: [];
}>();

const MOCK_CONNECTION_ID = '695e87a44b94d8546b8e38e6';

const STEPS: ThinkingStepDef[] = [
  {
    id: 'review-sources',
    title: 'Reviewing Previously Created Sources',
    content: {
      paragraphs: [
        'Checked existing sources for overlapping tables and naming conflicts. No duplicate sources found for the selected tables.',
      ],
    },
  },
  {
    id: 'suggestions',
    title: 'Making Data Source Suggestions',
    content: {
      paragraphs: [
        'How do order items vary across orders in terms of quantity, pricing, and line value?',
        'Are there patterns in item activity that support operational or sales-style analysis without relying on unavailable tables like orders or products?',
      ],
      codeTokens: ['orders', 'products'],
      sections: [
        { title: 'Recommended data source' },
        { title: 'Name: Order Item Transaction Detail' },
        { title: 'Tables to include' },
        { title: 'Why' },
      ],
    },
  },
  {
    id: 'semantic-layer',
    title: 'Establishing Semantic Layer',
    content: {
      paragraphs: [
        'Mapped dimensions and measures from the selected tables and established join paths for analysis.',
      ],
    },
  },
  {
    id: 'formatting',
    title: 'Formatting Columns',
    content: {
      formattedColumns: {
        intro: 'The following fields were reformatted:',
        fields: [
          {
            name: 'order_item_id',
            detail:
              'Formatted as PLAIN with 0 decimals and no separators because the name/label indicates it is an identifier, not a quantity.',
          },
          {
            name: 'order_id',
            detail:
              'Formatted as PLAIN with 0 decimals and no separators. Identified as a small whole-number key field.',
          },
          {
            name: 'product_id',
            detail:
              'Formatted as PLAIN with 0 decimals and no separators. Identified as a categorical key value.',
          },
          {
            name: 'quantity',
            detail:
              'Formatted as PLAIN with 0 decimals. Note mentions that default separators remain appropriate but are not important due to the small range.',
          },
        ],
      },
    },
  },
  {
    id: 'expressions',
    title: 'Suggesting Expressions & Metrics',
    content: {
      paragraphs: [
        'Proposed line value and average quantity expressions to support sales-style analysis on order items.',
      ],
    },
  },
  {
    id: 'summarizing',
    title: 'Summarizing Data Source',
    content: {
      paragraphs: [
        'Prepared a short summary of tables, key fields, and suggested next questions for the analyst.',
      ],
    },
  },
];

const STEP_DELAY_MS = 1400;

const statuses = ref<ThinkingStepStatus[]>(STEPS.map(() => 'pending'));
const expandedIds = ref<Set<string>>(new Set());
const isDone = ref(false);
const showWorking = ref(false);

let timers: number[] = [];

const startMessage = computed(
  () =>
    `Data Source Agent starting for data connection '${props.connectionName}' (${props.connectionId || MOCK_CONNECTION_ID}). Retrieving schema for analysis...`,
);

function clearTimers() {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedIds.value = next;
}

function isExpanded(id: string) {
  return expandedIds.value.has(id);
}

function highlightParagraph(text: string, tokens: string[] = []): { type: 'text' | 'code'; value: string }[] {
  if (!tokens.length) return [{ type: 'text', value: text }];
  const pattern = new RegExp(`\\b(${tokens.map(escapeRegExp).join('|')})\\b`, 'g');
  const parts: { type: 'text' | 'code'; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: 'text', value: text }];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function reset() {
  clearTimers();
  statuses.value = STEPS.map(() => 'pending');
  expandedIds.value = new Set();
  isDone.value = false;
  showWorking.value = false;
}

function runSequence() {
  reset();
  showWorking.value = true;

  STEPS.forEach((step, index) => {
    const startAt = index * STEP_DELAY_MS;
    const completeAt = startAt + STEP_DELAY_MS;

    timers.push(
      window.setTimeout(() => {
        statuses.value = statuses.value.map((status, i) => {
          if (i < index) return 'completed';
          if (i === index) return 'active';
          return 'pending';
        });
        expandedIds.value = new Set([step.id]);
      }, startAt),
    );

    timers.push(
      window.setTimeout(() => {
        statuses.value = statuses.value.map((status, i) =>
          i <= index ? 'completed' : status === 'active' ? 'pending' : status,
        );
        if (index === STEPS.length - 1) {
          showWorking.value = false;
          isDone.value = true;
          expandedIds.value = new Set();
          emit('completed');
        }
      }, completeAt),
    );
  });
}

watch(
  () => props.running,
  (running) => {
    if (running) runSequence();
    // When the run ends, keep the completed accordion visible (do not reset).
  },
);

onMounted(() => {
  if (props.running) runSequence();
});

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<template>
  <div class="w-full text-[13px] leading-relaxed text-[#25262E]">
    <p class="mb-3 text-sm text-[#6B6B6B]">{{ startMessage }}</p>

    <div class="space-y-2">
      <div
        v-for="(step, index) in STEPS"
        :key="step.id"
        v-show="statuses[index] !== 'pending'"
        class="overflow-hidden rounded-md border border-[#E2E2E2] bg-white"
        :class="isExpanded(step.id) ? 'border-[#C9B8E8]' : ''"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#F8F6FC]"
          @click="toggleExpanded(step.id)"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 flex-shrink-0 text-[#9A9A9A] transition-transform"
            :class="isExpanded(step.id) ? 'rotate-90' : ''"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>

          <span class="min-w-0 flex-1 font-medium text-[#25262E]">{{ step.title }}</span>

          <span
            v-if="statuses[index] === 'completed'"
            class="flex flex-shrink-0 items-center gap-1.5 text-[#6B6B6B]"
          >
            Completed
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-[#1B9E4B]" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>

          <span
            v-else-if="statuses[index] === 'active'"
            class="flex flex-shrink-0 items-center gap-1.5 text-[#3B1770]"
          >
            In progress...
            <svg viewBox="0 0 24 24" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3a9 9 0 1 0 9 9" stroke-linecap="round" />
            </svg>
          </span>
        </button>

        <div
          v-if="isExpanded(step.id) && step.content"
          class="border-t border-[#E2E2E2] px-3 py-3 text-[#6B6B6B]"
        >
          <!-- Bullet questions / paragraphs -->
          <ul v-if="step.content.paragraphs?.length" class="mb-3 space-y-2">
            <li
              v-for="(paragraph, pIndex) in step.content.paragraphs"
              :key="pIndex"
              class="flex gap-2"
            >
              <span class="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#9A9A9A]"></span>
              <span class="text-[#25262E]">
                <template
                  v-for="(part, partIndex) in highlightParagraph(paragraph, step.content.codeTokens)"
                  :key="partIndex"
                >
                  <code
                    v-if="part.type === 'code'"
                    class="rounded bg-[#F1F1F1] px-1 py-0.5 font-mono text-[12px] text-[#3B1770]"
                  >{{ part.value }}</code>
                  <template v-else>{{ part.value }}</template>
                </template>
              </span>
            </li>
          </ul>

          <!-- Section headers with dividers -->
          <div v-if="step.content.sections?.length" class="divide-y divide-[#E2E2E2] border-t border-[#E2E2E2]">
            <div
              v-for="(section, sIndex) in step.content.sections"
              :key="sIndex"
              class="py-2.5"
            >
              <p class="font-semibold text-[#25262E]">{{ section.title }}</p>
              <p v-if="section.body" class="mt-1 text-[#6B6B6B]">{{ section.body }}</p>
            </div>
          </div>

          <!-- Formatted columns block -->
          <div v-if="step.content.formattedColumns">
            <p class="mb-2 font-semibold text-[#25262E]">Formatted Columns</p>
            <div class="mb-3 border-t border-[#E2E2E2]"></div>
            <p class="mb-3 text-[#25262E]">{{ step.content.formattedColumns.intro }}</p>
            <div class="space-y-3">
              <p
                v-for="field in step.content.formattedColumns.fields"
                :key="field.name"
                class="text-[#25262E]"
              >
                <span class="font-semibold">{{ field.name }}</span>
                <span class="text-[#6B6B6B]">: {{ field.detail }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Working indicator -->
    <div v-if="showWorking" class="mt-3 space-y-2">
      <span class="inline-flex rounded-full bg-[#F5F1FC] px-3 py-1 text-xs font-medium text-[#3B1770]">
        Working on it...
      </span>
      <div class="flex items-center gap-1.5 pl-1" aria-hidden="true">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3B1770]"></span>
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3B1770] [animation-delay:150ms]"></span>
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3B1770] [animation-delay:300ms]"></span>
      </div>
    </div>

    <p v-if="isDone" class="mt-3 text-sm text-[#6B6B6B]">Data Source Agent completed.</p>
  </div>
</template>
