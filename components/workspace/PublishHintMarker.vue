<script setup lang="ts">
defineProps<{
  label?: string;
}>();

defineEmits<{
  click: [];
}>();
</script>

<template>
  <!-- Arrow-shaped hint that points right at the Artifacts panel button -->
  <button
    type="button"
    class="group flex h-7 items-center text-xs font-medium text-[#3B1770]"
    title="Open artifacts to publish"
    @click="$emit('click')"
  >
    <span
      class="flex h-full items-center rounded-l-md border-y-[1.5px] border-l-[1.5px] border-[#9B6BE8] bg-[#EFE5FD] pl-2.5 pr-1 transition-colors group-hover:bg-[#E4D4FB]"
    >
      {{ label ?? 'Ready to publish' }}
    </span>
    <svg viewBox="0 0 20 28" class="-ml-px h-7 w-5 flex-shrink-0" aria-hidden="true">
      <path
        d="M0 0.75H4Q7 0.75 9.5 2.5L18.5 13Q19.4 14 18.5 15L9.5 25.5Q7 27.25 4 27.25H0Z"
        class="fill-[#EFE5FD] transition-colors group-hover:fill-[#E4D4FB]"
      />
      <path
        d="M0 0.75H4Q7 0.75 9.5 2.5L18.5 13Q19.4 14 18.5 15L9.5 25.5Q7 27.25 4 27.25H0"
        fill="none"
        stroke="#9B6BE8"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>
