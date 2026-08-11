<script setup lang="ts">
import { computed } from 'vue';
import ActiveIndicator from '~/assets/images/menu-active-indicator.svg';

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});

const route = useRoute();

const isActive = computed(() => {
  const itemRoute = props.item.route as string | undefined;
  if (itemRoute) {
    if (itemRoute === '/') return route.path === '/';
    return route.path === itemRoute || route.path.startsWith(`${itemRoute}/`);
  }
  return Boolean(props.item.active);
});

const linkClass = computed(() => [
  'relative flex items-center px-3 py-2 transition-colors',
  isActive.value
    ? 'bg-[#16171C]'
    : 'hover:bg-[#1C1D22]',
]);
</script>

<template>
  <li>
    <NuxtLink
      v-if="item.route"
      :to="item.route"
      :class="linkClass"
    >
      <img
        v-if="isActive"
        :src="ActiveIndicator"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-1/2 h-[33px] w-[21px] -translate-y-1/2"
      />
      <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <img
          :src="item.icon"
          class="flex-shrink-0"
          :class="[item.isAvatar ? 'h-8 w-8 rounded-full' : 'h-6 w-6']"
        />
      </div>
      <span
        class="whitespace-nowrap transition-all duration-200"
        :class="[isCollapsed ? 'ml-0 w-0 opacity-0' : 'ml-4 w-auto opacity-100']"
      >
        {{ item.name }}
      </span>
    </NuxtLink>
    <a
      v-else
      href="#"
      :class="linkClass"
    >
      <img
        v-if="isActive"
        :src="ActiveIndicator"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-1/2 h-[33px] w-[21px] -translate-y-1/2"
      />
      <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <img
          :src="item.icon"
          class="flex-shrink-0"
          :class="[item.isAvatar ? 'h-8 w-8 rounded-full' : 'h-6 w-6']"
        />
      </div>
      <span
        class="whitespace-nowrap transition-all duration-200"
        :class="[isCollapsed ? 'ml-0 w-0 opacity-0' : 'ml-4 w-auto opacity-100']"
      >
        {{ item.name }}
      </span>
    </a>
  </li>
</template>
