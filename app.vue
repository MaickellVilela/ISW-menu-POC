<template>
  <div class="flex h-screen overflow-hidden">
    <SideMenu class="flex-shrink-0 z-10" />
    <main class="flex-1 min-w-0 h-screen overflow-y-auto">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import SideMenu from '~/components/SideMenu.vue';
</script>

<style>
body {
  background-color: #F1F1F1;
}
</style>
