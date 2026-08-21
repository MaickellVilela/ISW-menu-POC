<script setup lang="ts">
import { computed } from 'vue';
import ChangePasswordForm from '~/components/auth/ChangePasswordForm.vue';
import {
  getPasswordChangeReasonMessage,
  type AfterPasswordChange,
} from '~/composables/useChangePassword';

const route = useRoute();

const reasonMessage = computed(() => getPasswordChangeReasonMessage(String(route.query.reason ?? '')));

const afterSuccess = computed<AfterPasswordChange>(() =>
  route.query.after === 'reauthenticate' ? 'reauthenticate' : 'continue',
);

function onComplete() {
  if (afterSuccess.value === 'reauthenticate') {
    navigateTo('/login?changed=1');
    return;
  }
  navigateTo('/workspace');
}

function onCancel() {
  navigateTo('/login');
}
</script>

<template>
  <div class="relative flex min-h-full items-center justify-center overflow-hidden bg-[#0A0A0A] px-6 py-12">
    <div
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style="background: radial-gradient(ellipse 80% 70% at 100% 100%, #2D1F54 0%, rgba(45, 31, 84, 0.4) 32%, transparent 62%);"
    />
    <ChangePasswordForm
      class="relative z-10"
      :reason-message="reasonMessage"
      :after-success="afterSuccess"
      @complete="onComplete"
      @cancel="onCancel"
    />
  </div>
</template>
