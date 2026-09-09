<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  apiEndpointExamples,
  type FileFilterValueProvider,
} from '~/composables/useFilterValueConfiguration';

const props = defineProps<{
  open: boolean;
  provider: FileFilterValueProvider | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const copiedId = ref<string | null>(null);
const examples = computed(() =>
  props.provider ? apiEndpointExamples(props.provider) : [],
);

async function copyCommand(id: string, command: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(command);
    copiedId.value = id;
    window.setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 1500);
  } catch {
    copiedId.value = null;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && provider"
      class="fixed inset-0 z-[130] flex items-center justify-center bg-[#202938]/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <section
        class="flex max-h-[min(48rem,calc(100vh-2rem))] w-[min(60rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="File API endpoints"
      >
        <header class="flex flex-shrink-0 items-start justify-between gap-4 border-b border-[#E2E2E2] px-6 py-5">
          <div>
            <h2 class="text-xl font-semibold text-[#25262E]">API endpoints</h2>
            <p class="mt-1 text-sm text-[#667085]">{{ provider.name }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A6270] transition-colors hover:bg-[#F3F3F4] hover:text-[#25262E]"
            aria-label="Close API endpoints"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section v-for="example in examples" :key="example.id">
            <div class="flex flex-wrap items-end justify-between gap-3 border-b border-[#D8DCE2] pb-2">
              <div>
                <h3 class="text-sm font-semibold text-[#25262E]">{{ example.title }}</h3>
                <p class="mt-1 text-xs text-[#667085]">
                  {{ example.method }} request
                </p>
              </div>
              <span
                v-if="example.requestBody"
                class="rounded-md border border-[#D8DCE2] bg-white px-2.5 py-1.5 text-xs text-[#52525B]"
              >
                {{ example.requestBody }}
              </span>
            </div>

            <div class="relative mt-3 rounded-lg bg-[#F7F7F8] p-4 pr-12">
              <pre class="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[#25262E]">{{ example.command }}</pre>
              <button
                type="button"
                class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-white hover:text-[#3B1770]"
                :aria-label="`Copy ${example.title} command`"
                @click="copyCommand(example.id, example.command)"
              >
                <svg v-if="copiedId !== example.id" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="8" y="8" width="11" height="12" rx="1.5" />
                  <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v10A1.5 1.5 0 0 0 5.5 17H8" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-4 w-4 text-[#257A4A]" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m5 12 4 4L19 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </section>

          <p class="rounded-md bg-[#FFF8E7] px-3 py-2.5 text-xs leading-relaxed text-[#7A5B16]">
            Replace <code class="font-mono">${BASE_URL}</code>, <code class="font-mono">${USERNAME}</code>, and
            <code class="font-mono">${PASSWORD}</code> at runtime. Credentials are never stored in this configuration.
          </p>
        </div>

        <footer class="flex flex-shrink-0 justify-end border-t border-[#E2E2E2] px-6 py-4">
          <button
            type="button"
            class="rounded-md border border-[#C9CED6] bg-white px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#6F42A5] hover:text-[#6F42A5]"
            @click="emit('close')"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
