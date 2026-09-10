<script setup lang="ts">
import { ref } from 'vue';
import Button from '../../components/Button.vue';
import ToggleSwitch from '../../components/datasource/ToggleSwitch.vue';
import JoinVennIcon from '../../components/datasource/JoinVennIcon.vue';
import FieldSelect from '../../components/datasource/FieldSelect.vue';
import HistoryDisclosure from '../../components/workspace/HistoryDisclosure.vue';
import type { FieldOption } from '../../composables/useDataSourceCanvas';

const refreshEnabled = ref(true);
const cacheEnabled = ref(false);
const selectedField = ref('Transactions.amount');

const fieldOptions: FieldOption[] = [
  { value: 'Transactions.location_id', name: 'location_id', type: 'number', entity: 'Transactions' },
  { value: 'Transactions.amount', name: 'amount', type: 'currency', entity: 'Transactions' },
  { value: 'Locations.region', name: 'region', type: 'string', entity: 'Locations' },
];
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 p-2 text-ink">
    <header>
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Overview</p>
      <h1 class="mt-1 text-xl font-semibold">Component gallery</h1>
      <p class="mt-2 text-sm text-muted">
        Every documented component on one page. Open a component in the sidebar for props, variants, and the accessibility report.
      </p>
    </header>

    <section class="rounded-lg border border-line bg-surface">
      <header class="border-b border-line px-4 py-2.5">
        <h2 class="text-[13px] font-semibold">Button</h2>
        <p class="text-xs text-muted">Primary and secondary actions</p>
      </header>
      <div class="flex flex-wrap items-center gap-3 px-4 py-4">
        <Button>Save data source</Button>
        <Button variant="secondary">Cancel</Button>
        <Button size="sm">Apply</Button>
        <Button disabled>Disabled</Button>
      </div>
    </section>

    <section class="rounded-lg border border-line bg-surface">
      <header class="border-b border-line px-4 py-2.5">
        <h2 class="text-[13px] font-semibold">ToggleSwitch</h2>
        <p class="text-xs text-muted">Boolean settings</p>
      </header>
      <div class="flex flex-wrap items-center gap-6 px-4 py-4">
        <ToggleSwitch
          v-model="refreshEnabled"
          label="Enable scheduled refresh"
        />
        <ToggleSwitch
          v-model="cacheEnabled"
          size="sm"
          label="Enable caching"
        />
        <ToggleSwitch
          :model-value="true"
          disabled
          label="Locked setting"
        />
      </div>
    </section>

    <section class="rounded-lg border border-line bg-surface">
      <header class="border-b border-line px-4 py-2.5">
        <h2 class="text-[13px] font-semibold">JoinVennIcon</h2>
        <p class="text-xs text-muted">Join types on the canvas</p>
      </header>
      <div class="flex flex-wrap items-end gap-8 px-4 py-4 text-center text-xs text-muted">
        <figure class="space-y-1.5">
          <JoinVennIcon type="inner" :size="32" />
          <figcaption>inner</figcaption>
        </figure>
        <figure class="space-y-1.5">
          <JoinVennIcon type="left" :size="32" />
          <figcaption>left</figcaption>
        </figure>
        <figure class="space-y-1.5">
          <JoinVennIcon type="full" :size="32" />
          <figcaption>full</figcaption>
        </figure>
      </div>
    </section>

    <section class="rounded-lg border border-line bg-surface">
      <header class="border-b border-line px-4 py-2.5">
        <h2 class="text-[13px] font-semibold">FieldSelect</h2>
        <p class="text-xs text-muted">Field picker used in joins and filters</p>
      </header>
      <div class="px-4 py-4">
        <div class="w-56">
          <FieldSelect v-model="selectedField" :options="fieldOptions" />
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-line bg-surface">
      <header class="border-b border-line px-4 py-2.5">
        <h2 class="text-[13px] font-semibold">HistoryDisclosure</h2>
        <p class="text-xs text-muted">Collapsible step in the agent history</p>
      </header>
      <div class="px-4 py-4">
        <div class="max-w-md">
          <HistoryDisclosure
            title="Joined Transactions → Locations"
            meta="2 min ago"
            default-open
          >
            <p class="text-[13px] text-muted">
              Matched on <code>location_id</code>. 1,248 rows in the preview.
            </p>
          </HistoryDisclosure>
        </div>
      </div>
    </section>
  </div>
</template>
