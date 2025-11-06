<template>
  <div class="relative min-h-screen">
    <SideMenu @update:collapsed="isMenuCollapsed = $event" class="fixed top-0 left-0 h-full z-10" />
    <main
      class="p-10 transition-all duration-300 ease-in-out"
      :style="{ paddingLeft: isMenuCollapsed ? '56px' : '256px' }"
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
