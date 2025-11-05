<template>
  <li class="relative px-2 py-3 rounded-md hover:bg-[#3a3a3a]">
    <div v-if="item.active" class="absolute left-0 top-0 h-full w-1 bg-[#8A2BE2] rounded-r-md"></div>
    <a href="#" class="flex items-center" :class="{'justify-center': isCollapsed}">
      <img :src="item.icon" class="flex-shrink-0" :class="[item.isAvatar ? 'w-8 h-8 rounded-full' : 'w-6 h-6']" />
      <span
        class="whitespace-nowrap transition-all duration-200"
        :class="[isCollapsed ? 'w-0 ml-0 opacity-0' : 'w-auto ml-4 opacity-100']"
      >
        {{ item.name }}
      </span>
    </a>
  </li>
</template>

<script setup lang="ts">
defineProps({
  item: {
    type: Object,
    required: true,
  },
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});
</script>
