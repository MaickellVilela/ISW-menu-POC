<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import type {
  ConnectionOption,
  DataSourceSetup,
  SchemaOption,
} from '~/composables/useDataSourceFlow';
import { useDataSourceWizard } from '~/composables/useDataSourceWizard';
import UseCaseStep from '~/components/workspace/steps/UseCaseStep.vue';
import ConnectionStep from '~/components/workspace/steps/ConnectionStep.vue';
import TableConfigStep from '~/components/workspace/steps/TableConfigStep.vue';

const props = defineProps<{
  open: boolean;
  connections: ConnectionOption[];
  schemas: SchemaOption[];
}>();

const emit = defineEmits<{
  cancel: [];
  submit: [setup: DataSourceSetup];
}>();

const {
  steps,
  stepIndex,
  currentStep,
  isFirstStep,
  isLastStep,
  useCase,
  connectionId,
  tableConfig,
  canContinue,
  reset,
  next,
  back,
  buildSetup,
} = useDataSourceWizard({ connections: props.connections, schemas: props.schemas });

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel');
}

watch(
  () => props.open,
  (open) => {
    if (open) reset();
    if (typeof window === 'undefined') return;
    if (open) window.addEventListener('keydown', onEscape);
    else window.removeEventListener('keydown', onEscape);
  },
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEscape);
});

function onPrimary() {
  if (!canContinue.value) return;
  if (!isLastStep.value) {
    next();
    return;
  }
  const setup = buildSetup();
  if (setup) emit('submit', setup);
}

function onSecondary() {
  if (isFirstStep.value) emit('cancel');
  else back();
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Create Data Source"
      >
        <div class="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex-shrink-0 border-b border-[#E2E2E2] px-6 py-4">
            <h2 class="text-base font-semibold text-[#25262E]">Create Data Source</h2>
          </div>

          <!-- Stepper -->
          <div class="flex flex-shrink-0 items-center justify-center gap-3 px-6 py-5">
            <template v-for="(step, index) in steps" :key="step.id">
              <span
                v-if="index > 0"
                class="h-px w-16 flex-shrink-0"
                :class="index <= stepIndex ? 'bg-[#3B1770]' : 'bg-[#E2E2E2]'"
              ></span>

              <span class="flex items-center gap-2">
                <span
                  class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
                  :class="
                    index <= stepIndex
                      ? 'border-[#3B1770] bg-[#3B1770] text-white'
                      : 'border-[#D8D8D8] bg-white text-[#9A9A9A]'
                  "
                >
                  <svg
                    v-if="index < stepIndex"
                    viewBox="0 0 24 24"
                    class="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <template v-else>{{ index + 1 }}</template>
                </span>
                <span
                  class="text-sm"
                  :class="index === stepIndex ? 'font-semibold text-[#25262E]' : 'text-[#9A9A9A]'"
                >
                  {{ step.label }}
                </span>
              </span>
            </template>
          </div>

          <!-- Active step -->
          <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <UseCaseStep
              v-if="currentStep.id === 'use-case'"
              :value="useCase"
              @update:value="useCase = $event"
            />
            <ConnectionStep
              v-else-if="currentStep.id === 'connection'"
              :connections="connections"
              :selected-id="connectionId"
              @update:selected-id="connectionId = $event"
            />
            <TableConfigStep
              v-else
              :schemas="schemas"
              :value="tableConfig"
              @update:value="tableConfig = $event"
            />
          </div>

          <!-- Footer -->
          <div class="flex flex-shrink-0 items-center justify-between border-t border-[#E2E2E2] px-6 py-4">
            <button
              type="button"
              class="rounded-md border border-[#E2E2E2] px-4 py-2 text-sm font-medium text-[#25262E] transition-colors hover:border-[#3B1770] hover:text-[#3B1770]"
              @click="onSecondary"
            >
              {{ isFirstStep ? 'Cancel' : 'Back' }}
            </button>
            <button
              type="button"
              class="rounded-md bg-[#3B1770] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4B1E8C] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canContinue"
              @click="onPrimary"
            >
              {{ isLastStep ? 'Start Agent' : 'Continue' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>
