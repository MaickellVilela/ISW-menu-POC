<script setup lang="ts">
import JoinVennIcon from './JoinVennIcon.vue';
</script>

<template>
  <div>
    <!-- Mini flow diagram -->
    <div class="mb-5 flex items-center justify-center gap-2">
      <div class="flex flex-col items-center gap-1">
        <div class="flex h-10 w-14 items-center justify-center rounded-md border border-[#D8D8D8] bg-[#F7F9FC] text-[#3B6BB5]">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 14h18M9 4v16" /></svg>
        </div>
        <span class="text-[10px] text-[#9A9A9A]">Source</span>
      </div>
      <svg viewBox="0 0 24 24" class="h-5 w-7 text-[#C4C4C4]" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h14m0 0-5-5m5 5-5 5" /></svg>
      <div class="flex flex-col items-center gap-1">
        <div class="flex h-10 w-14 items-center justify-center rounded-md border border-[#C9B8EC] bg-[#F5F1FC]">
          <JoinVennIcon type="inner" :size="22" />
        </div>
        <span class="text-[10px] text-[#9A9A9A]">Join</span>
      </div>
      <svg viewBox="0 0 24 24" class="h-5 w-7 text-[#C4C4C4]" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h14m0 0-5-5m5 5-5 5" /></svg>
      <div class="flex flex-col items-center gap-1">
        <div class="flex h-10 w-14 items-center justify-center rounded-md bg-[#25262E] text-white">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
        </div>
        <span class="text-[10px] text-[#9A9A9A]">Output</span>
      </div>
    </div>

    <h3 class="text-sm font-semibold text-[#25262E]">Build your join pipeline</h3>
    <ol class="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-xs text-[#6B6B6B]">
      <li class="flex gap-2"><span class="font-semibold text-[#3B1770]">1.</span> Drag a table from the right panel onto the canvas.</li>
      <li class="flex gap-2"><span class="font-semibold text-[#3B1770]">2.</span> Drag from a node's right handle onto another to create a join.</li>
      <li class="flex gap-2"><span class="font-semibold text-[#3B1770]">3.</span> Pick the join type and matching fields right on the card.</li>
      <li class="flex gap-2"><span class="font-semibold text-[#3B1770]">4.</span> Connect the final join to <span class="font-medium text-[#25262E]">Output</span>.</li>
    </ol>
  </div>
</template>
