<script setup lang="ts">
import type { Connection, ConnectionKind, Point } from '~/composables/useDataSourceCanvas';

defineProps<{
  connections: Connection[];
  width: number;
  height: number;
  tempLine?: { from: Point; to: Point } | null;
  suggestion?: { from: Point; to: Point } | null;
}>();

const STROKE: Record<ConnectionKind, string> = {
  left: '#3B6BB5',
  right: '#8B5CF6',
  output: '#25262E',
};

function bezierPath(from: Point, to: Point): string {
  const curve = Math.max(48, Math.abs(to.x - from.x) * 0.5);
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}
</script>

<template>
  <svg class="pointer-events-none absolute left-0 top-0" :width="width" :height="height">
    <path
      v-for="connection in connections"
      :key="connection.id"
      :d="bezierPath(connection.from, connection.to)"
      fill="none"
      :stroke="STROKE[connection.kind]"
      stroke-width="2"
    />
    <path
      v-if="suggestion"
      :d="bezierPath(suggestion.from, suggestion.to)"
      fill="none"
      stroke="#9A7BD0"
      stroke-width="2"
      stroke-dasharray="6 5"
    />
    <path
      v-if="tempLine"
      :d="bezierPath(tempLine.from, tempLine.to)"
      fill="none"
      stroke="#3B1770"
      stroke-width="2"
      stroke-dasharray="6 5"
    />
  </svg>
</template>
