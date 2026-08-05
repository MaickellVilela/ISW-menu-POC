import { computed, ref } from 'vue';
import type {
  ConnectionOption,
  DataSourceSetup,
  SchemaOption,
  TableConfigPayload,
  UseCasePayload,
} from '~/composables/useDataSourceFlow';

export type WizardStepId = 'use-case' | 'connection' | 'configuration';

export interface WizardStep {
  id: WizardStepId;
  label: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'use-case', label: 'Use case' },
  { id: 'connection', label: 'Connection' },
  { id: 'configuration', label: 'Configuration' },
];

// --- Pure validation / defaults (unit testable without a component) ---

export function isUseCaseValid(payload: UseCasePayload): boolean {
  return payload.description.trim().length > 0;
}

export function isConnectionValid(connectionId: string | null): boolean {
  return connectionId !== null;
}

export function isTableConfigValid(payload: TableConfigPayload): boolean {
  return payload.tables.length > 0;
}

/** Prefer a schema that actually has tables so the picker is never empty on open. */
export function defaultSchemaName(schemas: SchemaOption[]): string {
  return (schemas.find((schema) => schema.tables.length > 0) ?? schemas[0])?.name ?? '';
}

export interface UseDataSourceWizardOptions {
  connections: ConnectionOption[];
  schemas: SchemaOption[];
}

export function useDataSourceWizard(options: UseDataSourceWizardOptions) {
  const stepIndex = ref(0);
  const useCase = ref<UseCasePayload>({ description: '', fileName: null });
  const connectionId = ref<string | null>(null);
  const tableConfig = ref<TableConfigPayload>({
    schema: defaultSchemaName(options.schemas),
    tables: [],
  });

  const currentStep = computed(() => WIZARD_STEPS[stepIndex.value]);
  const isFirstStep = computed(() => stepIndex.value === 0);
  const isLastStep = computed(() => stepIndex.value === WIZARD_STEPS.length - 1);

  const selectedConnection = computed(
    () => options.connections.find((connection) => connection.id === connectionId.value) ?? null,
  );

  const canContinue = computed(() => {
    switch (currentStep.value.id) {
      case 'use-case':
        return isUseCaseValid(useCase.value);
      case 'connection':
        return isConnectionValid(connectionId.value);
      case 'configuration':
        return isTableConfigValid(tableConfig.value);
      default:
        return false;
    }
  });

  function reset(): void {
    stepIndex.value = 0;
    useCase.value = { description: '', fileName: null };
    connectionId.value = null;
    tableConfig.value = { schema: defaultSchemaName(options.schemas), tables: [] };
  }

  function next(): void {
    if (!canContinue.value || isLastStep.value) return;
    stepIndex.value += 1;
  }

  function back(): void {
    if (isFirstStep.value) return;
    stepIndex.value -= 1;
  }

  /** Returns the collected setup, or null when the wizard is incomplete. */
  function buildSetup(): DataSourceSetup | null {
    const connection = selectedConnection.value;
    if (!connection || !isUseCaseValid(useCase.value) || !isTableConfigValid(tableConfig.value)) {
      return null;
    }
    return {
      useCase: { ...useCase.value, description: useCase.value.description.trim() },
      connection,
      tableConfig: { ...tableConfig.value },
    };
  }

  return {
    steps: WIZARD_STEPS,
    stepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    useCase,
    connectionId,
    tableConfig,
    selectedConnection,
    canContinue,
    reset,
    next,
    back,
    buildSetup,
  };
}
