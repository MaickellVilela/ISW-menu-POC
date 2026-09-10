<script setup lang="ts">
import { typographyTokens } from '../../design-system/tokens';
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 p-2 text-ink">
    <header>
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Foundations</p>
      <h1 class="mt-1 text-xl font-semibold">Typography</h1>
      <p class="mt-2 text-sm text-muted">
        Type scale already used in the app. Specimens render with the live Tailwind classes.
      </p>
    </header>

    <ul class="divide-y divide-line rounded-lg border border-line bg-surface">
      <li
        v-for="token in typographyTokens"
        :key="token.name"
        class="grid gap-2 px-4 py-4 sm:grid-cols-[140px_1fr]"
      >
        <div class="text-xs text-muted">
          <p class="font-medium text-ink">{{ token.name }}</p>
          <p>{{ token.size }} · {{ token.weight }}</p>
          <code>{{ token.className }}</code>
        </div>
        <p :class="[token.className, token.weight === '600' ? 'font-semibold' : token.weight === '500' ? 'font-medium' : 'font-normal']">
          The quick brown fox jumps over the lazy dog
        </p>
        <p class="text-xs text-muted sm:col-start-2">{{ token.usage }}</p>
      </li>
    </ul>
  </div>
</template>
