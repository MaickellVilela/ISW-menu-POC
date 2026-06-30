<template>
  <li>
    <component
      :is="item.route ? 'NuxtLink' : 'a'"
      :to="item.route"
      href="#"
      class="flex items-center px-3 py-2 hover:bg-[#3a3a3a]"
    >
      <div class="flex items-center justify-center w-8 h-8 flex-shrink-0">
        <img :src="item.icon" class="flex-shrink-0" :class="[item.isAvatar ? 'w-8 h-8 rounded-full' : 'w-6 h-6']" />
      </div>
      <span
        class="whitespace-nowrap transition-all duration-200"
        :class="[isCollapsed ? 'w-0 ml-0 opacity-0' : 'w-auto ml-4 opacity-100']"
      >
        {{ item.name }}
      </span>
    </component>
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
