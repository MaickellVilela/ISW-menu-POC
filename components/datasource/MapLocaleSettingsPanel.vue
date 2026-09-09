<script setup lang="ts">
import type { MapLocaleSettings } from '~/composables/useDataSourceGlobalSettings';
import {
  COUNTRY_FORMATS,
  TILE_PROVIDERS,
} from '~/composables/useDataSourceGlobalSettings';

const props = defineProps<{
  modelValue: MapLocaleSettings;
}>();

const emit = defineEmits<{
  'update:modelValue': [settings: MapLocaleSettings];
}>();

type TextSetting = keyof MapLocaleSettings;

function updateSetting(key: TextSetting, event: Event): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: (event.target as HTMLInputElement | HTMLSelectElement).value,
  });
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-7 lg:px-10 lg:py-9">
    <header>
      <h1 class="text-xl font-semibold text-[#25262E]">Map &amp; locale</h1>
      <p class="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B6B6B]">
        Configure map tiles and geographic labels for visuals created from this source.
      </p>
    </header>

    <section class="mt-7 overflow-hidden rounded-xl border border-[#E2E2E2] bg-white">
      <div class="border-b border-[#EAEAEA] px-5 py-4">
        <h2 class="text-sm font-semibold text-[#25262E]">Map defaults</h2>
        <p class="mt-0.5 text-xs text-[#6B6B6B]">These choices apply to new map visuals.</p>
      </div>

      <div class="divide-y divide-[#F0F0F0] px-5">
        <div class="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center">
          <div>
            <label for="tile-provider" class="text-sm font-medium text-[#25262E]">Tile provider</label>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Choose the service used to render map tiles.</p>
          </div>
          <select
            id="tile-provider"
            :value="modelValue.tileProvider"
            class="h-9 rounded-md border border-[#D8D8D8] bg-white px-3 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            @change="updateSetting('tileProvider', $event)"
          >
            <option v-for="provider in TILE_PROVIDERS" :key="provider" :value="provider">
              {{ provider }}
            </option>
          </select>
        </div>

        <div class="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center">
          <div>
            <label for="tile-api-key" class="text-sm font-medium text-[#25262E]">API key</label>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Required when Mapbox is selected.</p>
          </div>
          <input
            id="tile-api-key"
            type="password"
            autocomplete="off"
            placeholder="Enter API key"
            :value="modelValue.apiKey"
            :disabled="modelValue.tileProvider !== 'Mapbox'"
            class="h-9 rounded-md border border-[#D8D8D8] bg-white px-3 text-sm text-[#25262E] placeholder:text-[#9A9A9A] outline-none focus:border-[#3B1770] disabled:bg-[#F5F5F5]"
            @input="updateSetting('apiKey', $event)"
          />
        </div>

        <div class="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center">
          <div>
            <label for="country-format" class="text-sm font-medium text-[#25262E]">Country format</label>
            <p class="mt-0.5 text-xs text-[#6B6B6B]">Set how country values appear in legends and filters.</p>
          </div>
          <select
            id="country-format"
            :value="modelValue.countryFormat"
            class="h-9 rounded-md border border-[#D8D8D8] bg-white px-3 text-sm text-[#25262E] outline-none focus:border-[#3B1770]"
            @change="updateSetting('countryFormat', $event)"
          >
            <option v-for="format in COUNTRY_FORMATS" :key="format" :value="format">
              {{ format }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <section class="mt-5 rounded-xl border border-[#E2E2E2] bg-white p-5">
      <h2 class="text-sm font-semibold text-[#25262E]">Alternative calendars</h2>
      <p class="mt-1 text-sm text-[#6B6B6B]">No alternative calendars are defined for this source.</p>
    </section>
  </div>
</template>
