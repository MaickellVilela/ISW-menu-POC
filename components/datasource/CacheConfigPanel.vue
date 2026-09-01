<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  formatRelativeRefresh,
  useDataSourceCache,
  type CacheFieldRow,
} from '~/composables/useDataSourceCache';
import {
  defaultRefreshSchedule,
  type RefreshSchedule,
} from '~/composables/useRefreshSchedule';
import ScheduleRefreshModal from './ScheduleRefreshModal.vue';
import ToggleSwitch from './ToggleSwitch.vue';

const emit = defineEmits<{ 'go-to-canvas': [] }>();

const {
  settings,
  searchQuery,
  visibleFields,
  cachedCount,
  scheduledCount,
  load,
  setDataCacheEnabled,
  setStatisticsCacheEnabled,
  setScheduleRefreshEnabled,
  setFieldCache,
  setAllCache,
  setFieldInSchedule,
  refreshField,
} = useDataSourceCache();

const allFieldsCached = computed(
  () => settings.value.fields.length > 0 && cachedCount.value === settings.value.fields.length,
);

const showScheduleModal = ref(false);
const refreshSchedule = ref<RefreshSchedule>(defaultRefreshSchedule());

onMounted(() => {
  load();
});

function typeBadgeClass(type: string): string {
  if (type === 'Number') return 'bg-[#F3F3F4] text-[#25262E]';
  if (type === 'Time') return 'bg-[#EAF3F8] text-[#1A5A78]';
  return 'bg-[#F1ECFA] text-[#3B1770]';
}

function refreshLabel(row: CacheFieldRow): string {
  return formatRelativeRefresh(row.lastManualRefreshAt, Date.now());
}

function onScheduleRefreshToggle(enabled: boolean): void {
  setScheduleRefreshEnabled(enabled);
  if (enabled) showScheduleModal.value = true;
}

function saveRefreshSchedule(schedule: RefreshSchedule): void {
  refreshSchedule.value = schedule;
  showScheduleModal.value = false;
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-[#FAFAFA]">
    <div class="mx-auto max-w-5xl px-8 py-8">
      <div class="max-w-xl">
        <h1 class="text-lg font-semibold text-[#25262E]">Cache</h1>
        <p class="mt-1 text-sm leading-relaxed text-[#6B6B6B]">
          Decide what this source reuses across visuals, and which field statistics stay ready for filters and axes.
        </p>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <section class="flex items-start justify-between gap-4 rounded-xl border border-[#E2E2E2] bg-white p-5">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-[#25262E]">Data cache</p>
            <p class="mt-1 text-sm leading-relaxed text-[#6B6B6B]">
              Reuse query results so multiple visuals can share the same cached response.
            </p>
          </div>
          <ToggleSwitch
            :model-value="settings.dataCacheEnabled"
            label="Data cache"
            @update:model-value="setDataCacheEnabled"
          />
        </section>

        <section class="flex items-start justify-between gap-4 rounded-xl border border-[#E2E2E2] bg-white p-5">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-[#25262E]">Statistics cache</p>
            <p class="mt-1 text-sm leading-relaxed text-[#6B6B6B]">
              Keep min, max, and distinct-count metadata ready for each field.
            </p>
            <p v-if="settings.fields.length" class="mt-2 text-xs text-[#9A9A9A]">
              {{ cachedCount }} of {{ settings.fields.length }} fields cached
            </p>
          </div>
          <ToggleSwitch
            :model-value="settings.statisticsCacheEnabled"
            label="Statistics cache"
            @update:model-value="setStatisticsCacheEnabled"
          />
        </section>
      </div>

      <section class="mt-6 overflow-hidden rounded-xl border border-[#E2E2E2] bg-white">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E2E2] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#25262E]">Field statistics</h2>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">
              Choose which fields stay cached, and which join the refresh schedule.
            </p>
          </div>
          <div class="flex items-center gap-2 rounded-lg bg-[#FAFAFA] px-3 py-2">
            <span class="text-xs font-medium text-[#25262E]">Scheduled refresh</span>
            <ToggleSwitch
              size="sm"
              :model-value="settings.scheduleRefreshEnabled"
              :disabled="!settings.statisticsCacheEnabled"
              label="Scheduled refresh"
              @update:model-value="onScheduleRefreshToggle"
            />
            <button
              v-if="settings.scheduleRefreshEnabled"
              type="button"
              class="text-xs font-medium text-[#3B1770] hover:underline"
              @click="showScheduleModal = true"
            >
              Edit
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-b border-[#E2E2E2] px-5 py-3">
          <label class="relative min-w-[16rem] flex-1">
            <span class="sr-only">Search fields</span>
            <svg
              viewBox="0 0 24 24"
              class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A9A9A]"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search fields"
              class="w-full rounded-md border border-[#E2E2E2] bg-white py-1.5 pl-9 pr-3 text-sm text-[#25262E] placeholder:text-[#9A9A9A] focus:border-[#3B1770] focus:outline-none"
            />
          </label>
          <button
            type="button"
            class="text-xs font-medium text-[#3B1770] hover:underline disabled:text-[#9A9A9A] disabled:no-underline"
            :disabled="!settings.statisticsCacheEnabled || settings.fields.length === 0"
            @click="setAllCache(!allFieldsCached)"
          >
            {{ allFieldsCached ? 'Disable all' : 'Cache all' }}
          </button>
        </div>

        <p
          v-if="!settings.statisticsCacheEnabled"
          class="border-b border-[#E2E2E2] bg-[#F7F7F8] px-5 py-2.5 text-xs text-[#6B6B6B]"
        >
          Turn on statistics cache to edit field-level settings.
        </p>

        <div v-if="settings.fields.length === 0" class="px-5 py-16 text-center">
          <p class="text-sm font-medium text-[#25262E]">No fields on this source yet</p>
          <p class="mx-auto mt-1 max-w-sm text-sm text-[#6B6B6B]">
            Add entities on the canvas and connect them to Output to configure cache for the resulting fields.
          </p>
          <button
            type="button"
            class="mt-4 rounded-md bg-[#3B1770] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4B1E8C]"
            @click="emit('go-to-canvas')"
          >
            Open canvas
          </button>
        </div>

        <div v-else-if="visibleFields.length === 0" class="px-5 py-12 text-center text-sm text-[#6B6B6B]">
          No fields match “{{ searchQuery }}”.
        </div>

        <table v-else class="w-full text-left" :class="{ 'opacity-50': !settings.statisticsCacheEnabled }">
          <thead>
            <tr class="text-[11px] font-medium uppercase tracking-wide text-[#9A9A9A]">
              <th class="px-5 py-2.5 font-medium">Field</th>
              <th class="px-3 py-2.5 font-medium">Type</th>
              <th class="px-3 py-2.5 text-center font-medium">Cached</th>
              <th class="px-3 py-2.5 text-center font-medium">Scheduled</th>
              <th class="px-5 py-2.5 text-right font-medium">Refresh</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in visibleFields"
              :key="row.id"
              class="border-t border-[#F0F0F0]"
            >
              <td class="px-5 py-3">
                <p class="text-sm font-medium text-[#25262E]">{{ row.label }}</p>
                <p class="text-xs text-[#9A9A9A]">{{ row.entity }}</p>
              </td>
              <td class="px-3 py-3">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                  :class="typeBadgeClass(row.dataType)"
                >
                  {{ row.dataType }}
                </span>
              </td>
              <td class="px-3 py-3 text-center">
                <div class="flex justify-center">
                  <ToggleSwitch
                    size="sm"
                    :model-value="row.cacheEnabled"
                    :disabled="!settings.statisticsCacheEnabled"
                    :label="`Cached ${row.label}`"
                    @update:model-value="setFieldCache(row.id, $event)"
                  />
                </div>
              </td>
              <td class="px-3 py-3 text-center">
                <div class="flex justify-center">
                  <ToggleSwitch
                    size="sm"
                    :model-value="row.includeInSchedule"
                    :disabled="!settings.statisticsCacheEnabled || !settings.scheduleRefreshEnabled"
                    :label="`Scheduled ${row.label}`"
                    @update:model-value="setFieldInSchedule(row.id, $event)"
                  />
                </div>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-2">
                  <span class="text-[11px] text-[#9A9A9A]">{{ refreshLabel(row) }}</span>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6B6B6B] transition-colors hover:bg-[#F1ECFA] hover:text-[#3B1770] disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="!settings.statisticsCacheEnabled"
                    :title="`Refresh ${row.label}`"
                    @click="refreshField(row.id)"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <p
          v-if="settings.scheduleRefreshEnabled && settings.fields.length > 0"
          class="border-t border-[#E2E2E2] px-5 py-3 text-xs text-[#9A9A9A]"
        >
          {{ scheduledCount }} field{{ scheduledCount === 1 ? '' : 's' }} included in the scheduled refresh.
        </p>
      </section>
    </div>

    <ScheduleRefreshModal
      :open="showScheduleModal"
      :schedule="refreshSchedule"
      @cancel="showScheduleModal = false"
      @save="saveRefreshSchedule"
    />
  </div>
</template>
