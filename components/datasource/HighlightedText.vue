<script setup lang="ts">
import { computed } from 'vue';
import { highlightQuerySegments } from '~/composables/textHighlight';

const props = withDefaults(
  defineProps<{
    text: string;
    query?: string;
  }>(),
  { query: '' },
);

const segments = computed(() => highlightQuerySegments(props.text, props.query ?? ''));
</script>

<template>
  <span>
    <template v-for="(segment, index) in segments" :key="`${index}-${segment.text}`">
      <span
        v-if="segment.matched"
        class="rounded-sm bg-[#F6E27A] px-px font-semibold text-[#25262E]"
      >{{ segment.text }}</span>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>
