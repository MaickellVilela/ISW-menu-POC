<script setup lang="ts">
import { spacingTokens } from '../../design-system/tokens';
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 p-2 text-ink">
    <header>
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Foundations</p>
      <h1 class="mt-1 text-xl font-semibold">Spacing</h1>
      <p class="mt-2 text-sm text-muted">
        4px-based scale matching current padding utilities (<code>px-3</code>, <code>py-2</code>, …).
      </p>
    </header>

    <ul class="space-y-3">
      <li
        v-for="token in spacingTokens"
        :key="token.key"
        class="flex items-center gap-4"
      >
        <div class="w-24 shrink-0 text-xs text-muted">
          <p class="font-medium text-ink">{{ token.name }}</p>
          <p>{{ token.px }}px · p-{{ token.key }}</p>
        </div>
        <div class="h-4 rounded-sm bg-brand" :style="{ width: `${token.px * 4}px` }" />
        <p class="text-xs text-muted">{{ token.usage }}</p>
      </li>
    </ul>
  </div>
</template>
