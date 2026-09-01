<script setup lang="ts">
/**
 * Switch geometry follows the Tailwind UI / Headless UI toggle:
 * a 2px transparent border is the gutter, and the thumb travels
 * exactly its own width (sm: 16px, md: 20px).
 */
const TRACK = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
} as const;

const THUMB = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
} as const;

const THUMB_ON = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
} as const;

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
    label: string;
    size?: 'sm' | 'md';
  }>(),
  { disabled: false, size: 'md' },
);

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

function toggle(): void {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    class="relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0 align-middle transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B1770] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
    :class="[TRACK[size], modelValue ? 'bg-[#3B1770]' : 'bg-[#D8D8D8]']"
    @click="toggle"
  >
    <span
      aria-hidden="true"
      class="pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      :class="[THUMB[size], modelValue ? THUMB_ON[size] : 'translate-x-0']"
    />
  </button>
</template>
