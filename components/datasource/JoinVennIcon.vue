<script setup lang="ts">
import { computed } from 'vue';
import type { JoinType } from '~/composables/useDataSourceCanvas';

const props = withDefaults(
  defineProps<{ type: JoinType; size?: number; color?: string }>(),
  { size: 18, color: '#3B1770' },
);

// Unique clip id so multiple icons on the page don't collide.
const clipId = `venn-clip-${Math.random().toString(36).slice(2)}`;

const leftFilled = computed(() => props.type === 'left' || props.type === 'full');
const rightFilled = computed(() => props.type === 'full');
const intersectionFilled = computed(() => true); // always shaded for inner/left/full
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <clipPath :id="clipId">
        <circle cx="9" cy="12" r="6" />
      </clipPath>
    </defs>

    <!-- Base fills per side -->
    <circle cx="9" cy="12" r="6" :fill="leftFilled ? color : 'transparent'" />
    <circle cx="15" cy="12" r="6" :fill="rightFilled ? color : 'transparent'" />

    <!-- Intersection (right circle clipped by left) -->
    <circle
      v-if="intersectionFilled"
      cx="15"
      cy="12"
      r="6"
      :fill="color"
      :clip-path="`url(#${clipId})`"
    />

    <!-- Outlines -->
    <circle cx="9" cy="12" r="6" fill="none" :stroke="color" stroke-width="1.4" />
    <circle cx="15" cy="12" r="6" fill="none" :stroke="color" stroke-width="1.4" />
  </svg>
</template>
