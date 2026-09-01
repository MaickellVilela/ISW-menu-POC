<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  HOURS,
  MINUTES,
  SCHEDULE_FREQUENCIES,
  clampHour,
  clampMinute,
  defaultRefreshSchedule,
  formatScheduleSummary,
  padTimePart,
  type Meridiem,
  type RefreshSchedule,
  type ScheduleFrequency,
  type ScheduleMode,
} from '~/composables/useRefreshSchedule';

const CRON_DIAGRAM = `* * * * * *
┬ ┬ ┬ ┬ ┬ ┬
│ │ │ │ │ |
│ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
│ │ │ │ └───── month (1 - 12)
│ │ │ └────────── day of month (1 - 31)
│ │ └─────────────── hour (0 - 23)
│ └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, optional)`;

const CRON_EXAMPLES = [
  { expression: '23 */2 * * *', meaning: 'Every 0:23, 2:23, 4:23 and etc.' },
  { expression: '0-59 * * * *', meaning: 'Every minute' },
  { expression: '0-59/2 * * * *', meaning: 'Every even (not add) minute' },
  { expression: '15 10,13 * * 1,4', meaning: 'On Mon and Thu in 10:15 and 13:15' },
];

const props = defineProps<{
  open: boolean;
  schedule: RefreshSchedule;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [schedule: RefreshSchedule];
}>();

const draft = ref<RefreshSchedule>(defaultRefreshSchedule());
const summary = computed(() => formatScheduleSummary(draft.value));

function onEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('cancel');
}

watch(
  () => props.open,
  (open) => {
    if (open) draft.value = { ...props.schedule };
    if (typeof window === 'undefined') return;
    if (open) window.addEventListener('keydown', onEscape);
    else window.removeEventListener('keydown', onEscape);
  },
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEscape);
});

function setMode(mode: ScheduleMode): void {
  draft.value = { ...draft.value, mode };
}

function setFrequency(frequency: ScheduleFrequency): void {
  draft.value = { ...draft.value, frequency };
}

function setHour(value: string): void {
  draft.value = { ...draft.value, hour: clampHour(Number(value)) };
}

function setMinute(value: string): void {
  draft.value = { ...draft.value, minute: clampMinute(Number(value)) };
}

function setMeridiem(meridiem: Meridiem): void {
  draft.value = { ...draft.value, meridiem };
}

function setFrom(value: string): void {
  draft.value = { ...draft.value, from: value };
}

function setTo(value: string): void {
  draft.value = { ...draft.value, to: value };
}

function setCron(value: string): void {
  draft.value = { ...draft.value, cron: value };
}

function save(): void {
  emit('save', { ...draft.value });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-refresh-title"
      @click.self="emit('cancel')"
    >
      <div class="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <h2 id="schedule-refresh-title" class="text-base font-semibold text-[#25262E]">
              Refresh schedule
            </h2>
            <p class="mt-1 text-sm leading-relaxed text-[#6B6B6B]">
              Choose how often field statistics are rebuilt for this source.
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#6B6B6B] transition-colors hover:bg-[#F5F1FC] hover:text-[#3B1770]"
            aria-label="Close"
            @click="emit('cancel')"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="space-y-5 px-6 pb-5">
          <div class="grid grid-cols-2 gap-1 rounded-xl bg-[#F5F5F6] p-1" role="tablist" aria-label="Schedule type">
            <button
              type="button"
              role="tab"
              class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="draft.mode === 'periodic' ? 'bg-white text-[#25262E] shadow-sm' : 'text-[#6B6B6B] hover:text-[#25262E]'"
              :aria-selected="draft.mode === 'periodic'"
              @click="setMode('periodic')"
            >
              Periodic
            </button>
            <button
              type="button"
              role="tab"
              class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="draft.mode === 'advanced' ? 'bg-white text-[#25262E] shadow-sm' : 'text-[#6B6B6B] hover:text-[#25262E]'"
              :aria-selected="draft.mode === 'advanced'"
              @click="setMode('advanced')"
            >
              Advanced
            </button>
          </div>

          <div v-if="draft.mode === 'periodic'" class="space-y-5">
            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-[#9A9A9A]">Frequency</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in SCHEDULE_FREQUENCIES"
                  :key="option.id"
                  type="button"
                  class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                  :class="
                    draft.frequency === option.id
                      ? 'bg-[#3B1770] text-white'
                      : 'bg-[#F5F5F6] text-[#6B6B6B] hover:bg-[#EFE8F8] hover:text-[#3B1770]'
                  "
                  @click="setFrequency(option.id)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-[#9A9A9A]">Run time</p>
              <div class="inline-flex items-center gap-1 rounded-xl border border-[#E2E2E2] bg-[#FAFAFA] p-1.5">
                <select
                  class="h-9 rounded-lg border-0 bg-white px-2.5 text-sm font-medium text-[#25262E] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770]"
                  :value="draft.hour"
                  aria-label="Hour"
                  @change="setHour(($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="hour in HOURS" :key="hour" :value="hour">{{ hour }}</option>
                </select>
                <span class="px-0.5 text-sm font-semibold text-[#9A9A9A]">:</span>
                <select
                  class="h-9 rounded-lg border-0 bg-white px-2.5 text-sm font-medium text-[#25262E] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770]"
                  :value="draft.minute"
                  aria-label="Minute"
                  @change="setMinute(($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="minute in MINUTES" :key="minute" :value="minute">{{ padTimePart(minute) }}</option>
                </select>
                <div class="ml-1 flex rounded-lg bg-white p-0.5 shadow-sm">
                  <button
                    v-for="period in (['AM', 'PM'] as Meridiem[])"
                    :key="period"
                    type="button"
                    class="rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
                    :class="draft.meridiem === period ? 'bg-[#F1ECFA] text-[#3B1770]' : 'text-[#6B6B6B] hover:text-[#25262E]'"
                    @click="setMeridiem(period)"
                  >
                    {{ period }}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-[#9A9A9A]">Active window</p>
              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="mb-1 block text-xs text-[#6B6B6B]">From</span>
                  <input
                    type="date"
                    class="h-10 w-full rounded-lg border border-[#E2E2E2] bg-white px-3 text-sm text-[#25262E] focus:border-[#3B1770] focus:outline-none"
                    :value="draft.from"
                    @input="setFrom(($event.target as HTMLInputElement).value)"
                  />
                </label>
                <label class="block">
                  <span class="mb-1 block text-xs text-[#6B6B6B]">To</span>
                  <input
                    type="date"
                    class="h-10 w-full rounded-lg border border-[#E2E2E2] bg-white px-3 text-sm text-[#25262E] focus:border-[#3B1770] focus:outline-none"
                    :value="draft.to"
                    @input="setTo(($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div>
              <p class="mb-2 text-sm text-[#25262E]">Enter Cron Expression in the field below</p>
              <div class="flex items-center gap-3">
                <input
                  type="text"
                  spellcheck="false"
                  class="h-11 min-w-0 flex-1 rounded-lg border border-[#E2E2E2] bg-white px-3 font-mono text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:border-[#3B1770] focus:outline-none"
                  :value="draft.cron"
                  placeholder="Example: 2021 0 15 10 * * 6"
                  aria-label="Cron expression"
                  @input="setCron(($event.target as HTMLInputElement).value)"
                />
                <span class="flex-shrink-0 text-xs font-medium text-[#6B6B6B]">UTC</span>
              </div>
            </div>

            <pre class="overflow-x-auto rounded-xl border border-[#E2E2E2] bg-[#FAFAFA] px-4 py-3 font-mono text-xs leading-5 text-[#25262E]">{{ CRON_DIAGRAM }}</pre>

            <div>
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-[#9A9A9A]">Examples</p>
              <ul class="space-y-1.5 text-sm">
                <li v-for="example in CRON_EXAMPLES" :key="example.expression" class="flex flex-wrap gap-x-2">
                  <code class="font-mono text-xs text-[#3B1770]">{{ example.expression }}</code>
                  <span class="text-[#6B6B6B]">{{ example.meaning }}</span>
                </li>
              </ul>
            </div>
          </div>

          <p class="rounded-xl bg-[#F5F1FC] px-4 py-3 text-sm leading-relaxed text-[#3B1770]">
            {{ summary }}
          </p>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-[#E2E2E2] px-6 py-3">
          <button
            type="button"
            class="h-9 rounded-md px-3 text-sm font-medium text-[#3B1770] transition-colors hover:bg-[#F5F1FC]"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="h-9 rounded-md bg-[#3B1770] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C]"
            @click="save"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
