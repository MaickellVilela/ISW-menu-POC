<script setup lang="ts">
import type { TimeBarSettings } from '~/composables/useDataSourceGlobalSettings';
import {
  TIME_ATTRIBUTES,
  TIME_RANGE_ENDS,
  TIME_RANGE_STARTS,
} from '~/composables/useDataSourceGlobalSettings';
import ToggleSwitch from './ToggleSwitch.vue';

const props = defineProps<{
  modelValue: TimeBarSettings;
}>();

const emit = defineEmits<{
  'update:modelValue': [settings: TimeBarSettings];
}>();

type SelectSetting = 'defaultAttribute' | 'rangeStart' | 'rangeEnd';

function updateSetting<Key extends keyof TimeBarSettings>(
  key: Key,
  value: TimeBarSettings[Key],
): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function updateSelect(key: SelectSetting, event: Event): void {
  updateSetting(key, (event.target as HTMLSelectElement).value);
}

function updateMaxQueries(event: Event): void {
  updateSetting('maxQueries', Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-7 lg:px-10 lg:py-9">
    <header>
      <h1 class="text-xl font-semibold text-[#25262E]">Time bar</h1>
      <p class="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">
        Set the default time range and live-query behavior for visuals created from this source.
      </p>
    </header>

    <section class="mt-7 overflow-hidden rounded-xl border border-[#E2E2E2] bg-white">
      <div class="border-b border-[#EAEAEA] px-5 py-4">
        <h2 class="text-sm font-semibold text-[#25262E]">New visuals</h2>
        <p class="mt-0.5 text-xs text-[#6B6B6B]">
          These defaults apply when a visual is first created.
        </p>
      </div>

      <div class="divide-y divide-[#F0F0F0] px-5">
        <div class="flex items-center justify-between gap-6 py-4">
          <div>
            <p class="text-sm font-medium text-[#25262E]">Enable time bar</p>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Let viewers adjust a visual's time window.</p>
          </div>
          <ToggleSwitch
            :model-value="modelValue.enabled"
            label="Enable time bar"
            @update:model-value="updateSetting('enabled', $event)"
          />
        </div>

        <div class="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center">
          <label for="default-time-attribute" class="text-sm font-medium text-[#25262E]">
            Default time attribute
          </label>
          <select
            id="default-time-attribute"
            :value="modelValue.defaultAttribute"
            :disabled="!modelValue.enabled"
            class="h-9 rounded-md border border-[#D8D8D8] bg-white px-3 text-sm text-[#25262E] outline-none focus:border-[#3B1770] disabled:bg-[#F5F5F5] disabled:text-[#9A9A9A]"
            @change="updateSelect('defaultAttribute', $event)"
          >
            <option v-for="attribute in TIME_ATTRIBUTES" :key="attribute" :value="attribute">
              {{ attribute }}
            </option>
          </select>
        </div>

        <div class="flex items-center justify-between gap-6 py-4">
          <div>
            <p class="text-sm font-medium text-[#25262E]">Playback</p>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Allow the time range to advance automatically.</p>
          </div>
          <ToggleSwitch
            :model-value="modelValue.playbackEnabled"
            :disabled="!modelValue.enabled"
            label="Playback"
            @update:model-value="updateSetting('playbackEnabled', $event)"
          />
        </div>

        <fieldset class="py-4" :disabled="!modelValue.enabled">
          <legend class="text-sm font-medium text-[#25262E]">Default time range</legend>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1.5 text-xs font-medium text-[#6B6B6B]">
              From
              <select
                :value="modelValue.rangeStart"
                class="h-9 rounded-md border border-[#D8D8D8] bg-white px-3 text-sm font-normal text-[#25262E] outline-none focus:border-[#3B1770] disabled:bg-[#F5F5F5] disabled:text-[#9A9A9A]"
                @change="updateSelect('rangeStart', $event)"
              >
                <option v-for="start in TIME_RANGE_STARTS" :key="start" :value="start">
                  {{ start }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-medium text-[#6B6B6B]">
              To
              <select
                :value="modelValue.rangeEnd"
                class="h-9 rounded-md border border-[#D8D8D8] bg-white px-3 text-sm font-normal text-[#25262E] outline-none focus:border-[#3B1770] disabled:bg-[#F5F5F5] disabled:text-[#9A9A9A]"
                @change="updateSelect('rangeEnd', $event)"
              >
                <option v-for="end in TIME_RANGE_ENDS" :key="end" :value="end">
                  {{ end }}
                </option>
              </select>
            </label>
          </div>
        </fieldset>
      </div>
    </section>

    <section class="mt-5 overflow-hidden rounded-xl border border-[#E2E2E2] bg-white">
      <div class="border-b border-[#EAEAEA] px-5 py-4">
        <h2 class="text-sm font-semibold text-[#25262E]">Existing and new visuals</h2>
        <p class="mt-0.5 text-xs text-[#6B6B6B]">
          Query behavior updates across every visual that uses this source.
        </p>
      </div>

      <div class="divide-y divide-[#F0F0F0] px-5">
        <div class="flex items-center justify-between gap-6 py-4">
          <div>
            <p class="text-sm font-medium text-[#25262E]">Live mode</p>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Request fresh results instead of using a snapshot.</p>
          </div>
          <ToggleSwitch
            :model-value="modelValue.liveModeEnabled"
            label="Live mode"
            @update:model-value="updateSetting('liveModeEnabled', $event)"
          />
        </div>

        <div class="flex items-center justify-between gap-6 py-4">
          <div>
            <p class="text-sm font-medium text-[#25262E]">Prefer sharpening</p>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Improve result detail when the query engine supports it.</p>
          </div>
          <ToggleSwitch
            :model-value="modelValue.preferSharpening"
            label="Prefer sharpening"
            @update:model-value="updateSetting('preferSharpening', $event)"
          />
        </div>

        <div class="py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <label for="max-queries" class="text-sm font-medium text-[#25262E]">Maximum queries</label>
              <p class="mt-0.5 text-xs text-[#6B6B6B]">Limit simultaneous requests while live mode is active.</p>
            </div>
            <output
              for="max-queries"
              class="inline-flex min-w-9 justify-center rounded-md bg-[#F1ECFA] px-2 py-1 text-xs font-semibold text-[#3B1770]"
            >
              {{ modelValue.maxQueries }}
            </output>
          </div>
          <input
            id="max-queries"
            type="range"
            min="2"
            max="20"
            step="2"
            :value="modelValue.maxQueries"
            :disabled="!modelValue.liveModeEnabled"
            class="mt-4 w-full accent-[#3B1770] disabled:cursor-not-allowed disabled:opacity-40"
            @input="updateMaxQueries"
          />
          <div class="mt-1 flex justify-between text-[10px] text-[#9A9A9A]">
            <span>2</span>
            <span>20</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
