<template>
  <div class="flex">
    <SideMenu @update:collapsed="isMenuCollapsed = $event" />
    <main
      class="flex-1 p-10 transition-all duration-300 ease-in-out"
      :style="{ marginLeft: isMenuCollapsed ? '80px' : '256px' }"
    >
      <h1 class="text-4xl font-bold">Main Content</h1>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SideMenu from '~/components/SideMenu.vue';

const isMenuCollapsed = ref(true);
</script>

<style>
body {
  background-color: #F1F1F1;
}
</style>
