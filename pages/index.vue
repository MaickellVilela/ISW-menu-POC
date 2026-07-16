<template>
  <div class="flex h-full items-center justify-center p-10">
    <div class="w-full max-w-md rounded-xl border border-[#E2E2E2] bg-white p-8 text-center shadow-sm">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#F1ECFA] text-[#3B1770]">
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-[#25262E]">Data Source Creation POC</h1>
      <p class="mt-2 text-sm text-[#6B6B6B]">
        Explore the canvas prototype for building data sources with visual joins.
      </p>
      <NuxtLink
        to="/data-sources"
        class="mt-6 inline-flex items-center gap-2 rounded-md bg-[#3B1770] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B1E8C]"
      >
        Open the canvas
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14m0 0-5-5m5 5-5 5" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>
