<script setup lang="ts">
import { computed, ref } from 'vue';
import SimbaLogo from '~/assets/images/simba-logo-on-light.svg';

const route = useRoute();
const email = ref('');
const password = ref('');
const showPassword = ref(false);

const justChangedPassword = computed(() => route.query.changed === '1');

function onSubmit() {
  navigateTo('/workspace');
}
</script>

<template>
  <div class="relative flex min-h-full items-center justify-center overflow-hidden bg-[#0A0A0A] px-6 py-12">
    <div
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style="background: radial-gradient(ellipse 80% 70% at 100% 100%, #2D1F54 0%, rgba(45, 31, 84, 0.4) 32%, transparent 62%);"
    />

    <div class="relative z-10 w-full max-w-[560px] rounded-xl border border-[#E2E2E2] bg-white px-10 py-9 shadow-xl">
      <img :src="SimbaLogo" alt="Simba" class="mx-auto mb-6 h-9 w-auto" />

      <div
        v-if="justChangedPassword"
        class="mb-4 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5 text-sm text-[#166534]"
        role="status"
      >
        Password changed successfully. Sign in with your new password.
      </div>

      <h1 class="text-xl font-semibold text-[#25262E]">Sign in</h1>
      <p class="mt-1.5 text-sm text-[#6B6B6B]">
        Enter your credentials to continue to Simba.
      </p>

      <form class="mt-5" @submit.prevent="onSubmit">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium text-[#25262E]">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            name="email"
            autocomplete="username"
            class="h-11 w-full rounded-lg border border-[#E2E2E2] bg-white px-3 text-sm text-[#25262E] focus:border-[#3B1770] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-1"
          />
        </div>

        <div class="mt-4">
          <label for="password" class="mb-1.5 block text-sm font-medium text-[#25262E]">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              class="h-11 w-full rounded-lg border border-[#E2E2E2] bg-white py-2 pl-3 pr-11 text-sm text-[#25262E] focus:border-[#3B1770] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-1"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#6B6B6B] hover:text-[#25262E] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B1770]"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M3 3l18 18" stroke-linecap="round" />
                <path d="M10.6 10.7a2.5 2.5 0 003.5 3.5" stroke-linecap="round" />
                <path d="M9.9 5.2A9.8 9.8 0 0112 5c5 0 9 4.5 10 7-0.4 1-1.1 2.2-2.1 3.3M6.1 6.2C4.2 7.6 2.8 9.4 2 12c1 2.5 5 7 10 7 1.4 0 2.7-.3 3.9-.8" stroke-linecap="round" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#3B1770] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-2"
        >
          Sign in
        </button>
      </form>
    </div>
  </div>
</template>
