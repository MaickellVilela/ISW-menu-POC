<script setup lang="ts">
import {
  brandColors,
  neutralColors,
  statusColors,
  type ColorToken,
} from '../../design-system/tokens';
import {
  contrastRatio,
  formatContrastRatio,
  meetsWcagAa,
} from '../../design-system/contrast';

const SURFACE = '#FFFFFF';

type ColorGroup = {
  heading: string;
  tokens: ColorToken[];
};

const groups: ColorGroup[] = [
  { heading: 'Brand', tokens: brandColors },
  { heading: 'Neutrals', tokens: neutralColors },
  { heading: 'Status', tokens: statusColors },
];

function ratioOnWhite(hex: string): number {
  return contrastRatio(hex, SURFACE);
}

function passesAa(hex: string): boolean {
  return meetsWcagAa(hex, SURFACE);
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-2 text-ink">
    <header>
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Foundations</p>
      <h1 class="mt-1 text-xl font-semibold">Colors</h1>
      <p class="mt-2 text-sm text-muted">
        Tokens taken from the live UI. Text tokens show WCAG AA contrast against white (4.5:1).
      </p>
    </header>

    <section v-for="group in groups" :key="group.heading">
      <h2 class="mb-2 text-sm font-semibold">{{ group.heading }}</h2>
      <ul class="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <li
          v-for="token in group.tokens"
          :key="token.key"
          class="flex items-center gap-3 px-3 py-2"
        >
          <div
            class="h-10 w-10 flex-shrink-0 rounded border border-line"
            :style="{ backgroundColor: token.hex }"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-[13px] font-medium">{{ token.name }}</span>
              <code class="text-xs text-muted">{{ token.hex }}</code>
            </div>
            <p class="truncate text-xs text-muted">
              {{ token.usage }} · <code class="text-ink">bg-{{ token.key }}</code>
            </p>
          </div>
          <p
            v-if="token.usedAs === 'text'"
            class="w-36 flex-shrink-0 text-right text-[11px] font-medium"
            :class="passesAa(token.hex) ? 'text-success' : 'text-danger'"
          >
            {{ formatContrastRatio(ratioOnWhite(token.hex)) }}
            · {{ passesAa(token.hex) ? 'AA pass' : 'AA fail' }}
          </p>
          <p v-else class="w-36 flex-shrink-0 text-right text-[11px] text-muted">
            Surface
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
