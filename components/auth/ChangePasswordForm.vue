<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import SimbaLogo from '~/assets/images/simba-logo-on-light.svg';
import { useChangePassword } from '~/composables/useChangePassword';

const props = withDefaults(
  defineProps<{
    reasonMessage: string
    afterSuccess?: 'continue' | 'reauthenticate'
  }>(),
  {
    afterSuccess: 'continue',
  },
);

const emit = defineEmits<{
  cancel: []
  complete: []
}>();

const {
  newPassword,
  confirmPassword,
  showNewPassword,
  showConfirmPassword,
  serverError,
  requirements,
  strength,
  metCount,
  isValid,
  isSubmitting,
  isSuccess,
  showRequirementsError,
  showMismatch,
  showMatch,
  requirementsErrorMessage,
  onNewPasswordInput,
  onNewPasswordBlur,
  onConfirmPasswordBlur,
  submit,
} = useChangePassword();

let completeTimer: ReturnType<typeof setTimeout> | null = null;

watch(isSuccess, (success) => {
  if (!success) return;
  completeTimer = setTimeout(() => emit('complete'), 1600);
});

onBeforeUnmount(() => {
  if (completeTimer) clearTimeout(completeTimer);
});

async function onSubmit(): Promise<void> {
  await submit();
}

const successFollowUp = computed(() =>
  props.afterSuccess === 'reauthenticate'
    ? 'You will need to sign in with your new password.'
    : 'Continuing to the application.',
);

const strengthLabelClass = computed(() => {
  switch (strength.value.level) {
    case 'weak':
      return 'text-[#B42318]';
    case 'fair':
      return 'text-[#9A6700]';
    case 'good':
    case 'strong':
      return 'text-[#166534]';
    default:
      return 'text-[#6B6B6B]';
  }
});
</script>

<template>
  <div class="w-full max-w-[560px] rounded-xl border border-[#E2E2E2] bg-white px-10 py-9 shadow-xl">
    <div v-if="isSuccess" class="text-center" role="status" aria-live="polite">
      <div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F6EF] text-[#166534]">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-[#25262E]">Password changed successfully</h1>
      <p class="mt-2 text-sm text-[#6B6B6B]">{{ successFollowUp }}</p>
    </div>

    <form
      v-else
      class="flex flex-col"
      aria-labelledby="change-password-title"
      aria-describedby="change-password-reason"
      @submit.prevent="onSubmit"
    >
      <img :src="SimbaLogo" alt="Simba" class="mx-auto mb-6 h-9 w-auto" />

      <h1 id="change-password-title" class="text-2xl font-semibold tracking-tight text-[#25262E]">
        Create a new password
      </h1>
      <p id="change-password-reason" class="mt-2 max-w-lg text-sm leading-6 text-[#6B6B6B]">
        {{ reasonMessage }}
      </p>

      <div
        v-if="serverError"
        id="change-password-server-error"
        class="mt-4 rounded-md border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2.5 text-sm text-[#B42318]"
        role="alert"
      >
        {{ serverError }}
      </div>

      <div class="mt-5">
        <label for="new-password" class="mb-1.5 block text-sm font-medium text-[#25262E]">
          New password
        </label>
        <div class="relative">
          <input
            id="new-password"
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            name="new-password"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            :disabled="isSubmitting"
            :aria-invalid="showRequirementsError ? 'true' : 'false'"
            :aria-describedby="[
              'password-requirements',
              newPassword ? 'password-strength' : null,
              showRequirementsError ? 'new-password-error' : null,
              serverError ? 'change-password-server-error' : null,
            ].filter(Boolean).join(' ')"
            class="h-11 w-full rounded-lg border bg-white py-2 pl-3 pr-11 text-sm text-[#25262E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-1 disabled:bg-[#FAFAFA]"
            :class="showRequirementsError ? 'border-[#B42318]' : 'border-[#E2E2E2] focus:border-[#3B1770]'"
            @input="onNewPasswordInput"
            @blur="onNewPasswordBlur"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#6B6B6B] hover:text-[#25262E] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B1770]"
            :aria-label="showNewPassword ? 'Hide new password' : 'Show new password'"
            :aria-pressed="showNewPassword"
            :disabled="isSubmitting"
            @click="showNewPassword = !showNewPassword"
          >
            <svg v-if="showNewPassword" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
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

        <div
          v-if="newPassword"
          id="password-strength"
          class="mt-2 flex items-center gap-2"
          aria-label="Password strength"
        >
          <div class="flex flex-1 gap-1" aria-hidden="true">
            <span
              v-for="segment in 5"
              :key="segment"
              class="h-1 flex-1 rounded-full"
              :class="segment <= strength.filledSegments ? 'bg-[#3B1770]' : 'bg-[#E2E2E2]'"
            />
          </div>
          <span class="text-xs font-medium" :class="strengthLabelClass">{{ strength.label }}</span>
        </div>

        <p
          v-if="showRequirementsError"
          id="new-password-error"
          class="mt-2 text-sm text-[#B42318]"
        >
          {{ requirementsErrorMessage }}
        </p>

        <div id="password-requirements" class="mt-3">
          <p class="sr-only" aria-live="polite">
            {{ metCount }} of {{ requirements.length }} password requirements met.
          </p>
          <ul class="space-y-1.5" aria-label="Password requirements">
            <li
              v-for="requirement in requirements"
              :key="requirement.id"
              class="flex items-start gap-2 text-sm"
              :class="requirement.satisfied ? 'text-[#166534]' : 'text-[#6B6B6B]'"
            >
              <span class="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center" aria-hidden="true">
                <svg v-if="requirement.satisfied" viewBox="0 0 16 16" class="h-4 w-4" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#166534" />
                  <path d="M4.75 8.15l2.1 2.1 4.4-4.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <svg v-else viewBox="0 0 16 16" class="h-4 w-4" fill="none">
                  <circle cx="8" cy="8" r="6.25" stroke="#C4C4C4" stroke-width="1.5" />
                </svg>
              </span>
              <span>
                {{ requirement.label }}
                <span class="sr-only">{{ requirement.satisfied ? ', met' : ', not met' }}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-5">
        <label for="confirm-password" class="mb-1.5 block text-sm font-medium text-[#25262E]">
          Confirm new password
        </label>
        <div class="relative">
          <input
            id="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            name="confirm-password"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            :disabled="isSubmitting"
            :aria-invalid="showMismatch ? 'true' : 'false'"
            :aria-describedby="showMismatch ? 'confirm-password-error' : showMatch ? 'confirm-password-match' : undefined"
            class="h-11 w-full rounded-lg border bg-white py-2 pl-3 pr-11 text-sm text-[#25262E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-1 disabled:bg-[#FAFAFA]"
            :class="showMismatch ? 'border-[#B42318]' : showMatch ? 'border-[#166534]' : 'border-[#E2E2E2] focus:border-[#3B1770]'"
            @blur="onConfirmPasswordBlur"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#6B6B6B] hover:text-[#25262E] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B1770]"
            :aria-label="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
            :aria-pressed="showConfirmPassword"
            :disabled="isSubmitting"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <svg v-if="showConfirmPassword" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
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

        <p
          v-if="showMatch"
          id="confirm-password-match"
          class="mt-2 flex items-center gap-1.5 text-sm text-[#166534]"
          aria-live="polite"
        >
          <svg viewBox="0 0 16 16" class="h-4 w-4 flex-shrink-0" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#166534" />
            <path d="M4.75 8.15l2.1 2.1 4.4-4.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Passwords match
        </p>
        <p
          v-else-if="showMismatch"
          id="confirm-password-error"
          class="mt-2 flex items-center gap-1.5 text-sm text-[#B42318]"
          aria-live="polite"
        >
          <svg viewBox="0 0 16 16" class="h-4 w-4 flex-shrink-0" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#B42318" />
            <path d="M8 5v3.5M8 11h.01" stroke="white" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          Passwords don't match
        </p>
      </div>

      <button
        type="submit"
        class="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#3B1770] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#3B1770]/40 disabled:hover:bg-[#3B1770]/40"
        :disabled="!isValid || isSubmitting"
        :aria-busy="isSubmitting"
      >
        <svg
          v-if="isSubmitting"
          class="mr-2 h-4 w-4 animate-spin"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity="0.3" stroke-width="2" />
          <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ isSubmitting ? 'Changing password…' : 'Change password' }}
      </button>

      <button
        type="button"
        class="mt-3 h-10 w-full rounded-lg text-sm font-medium text-[#3B1770] transition-colors hover:bg-[#F5F1FC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-2 disabled:text-[#3B1770]/40"
        :disabled="isSubmitting"
        aria-label="Cancel and return to sign in"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <p class="mt-1 text-center text-xs text-[#9A9A9A]">
        Password change is required. Cancel returns you to sign in.
      </p>
    </form>
  </div>
</template>
