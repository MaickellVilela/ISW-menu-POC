<script setup lang="ts">
import { computed } from 'vue';
import {
  buttonClassNames,
  type ButtonSize,
  type ButtonVariant,
} from '~/design-system/button';

const props = withDefaults(
  defineProps<{
    /** Visual style. Primary is the brand fill used on login and save actions. */
    variant?: ButtonVariant;
    /** Compact (`sm`) matches dialog actions; `md` matches page-level CTAs. */
    size?: ButtonSize;
    disabled?: boolean;
    type?: 'button' | 'submit';
    /** Accessible name. Required when the slot is an icon only. */
    ariaLabel?: string;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
  },
);

const classes = computed(() => buttonClassNames(props.variant, props.size));
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled"
    :aria-label="ariaLabel"
  >
    <slot />
  </button>
</template>
