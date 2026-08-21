import { computed, ref } from 'vue'

export type PasswordChangeReason = 'expired' | 'temporary' | 'admin' | 'reset' | 'policy'
export type AfterPasswordChange = 'continue' | 'reauthenticate'
export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'
export type ChangePasswordStatus = 'idle' | 'submitting' | 'success' | 'server-error'

export interface PasswordRequirement {
  id: string
  label: string
  test: (password: string) => boolean
}

export interface RequirementStatus {
  id: string
  label: string
  satisfied: boolean
}

export interface PasswordStrength {
  level: PasswordStrengthLevel
  metCount: number
  filledSegments: number
  label: string
}

export interface PasswordChangeResult {
  ok: boolean
  message?: string
}

export const SPECIAL_CHARACTERS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'

export function hasSpecialCharacter(password: string): boolean {
  return [...password].some((character) => SPECIAL_CHARACTERS.includes(character))
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'At least 9 characters',
    test: (password) => password.length >= 9,
  },
  {
    id: 'lowercase',
    label: 'At least 1 lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'At least 1 uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'At least 1 number',
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: `At least 1 special character (${SPECIAL_CHARACTERS.slice(0, 7)}…)`,
    test: hasSpecialCharacter,
  },
]

export const DEFAULT_PASSWORD_CHANGE_MESSAGE =
  'For your security, you need to create a new password before continuing to the application.'

export const PASSWORD_CHANGE_REASONS: Record<PasswordChangeReason, string> = {
  expired: DEFAULT_PASSWORD_CHANGE_MESSAGE,
  temporary: DEFAULT_PASSWORD_CHANGE_MESSAGE,
  admin: DEFAULT_PASSWORD_CHANGE_MESSAGE,
  reset: DEFAULT_PASSWORD_CHANGE_MESSAGE,
  policy: DEFAULT_PASSWORD_CHANGE_MESSAGE,
}

/** Typical admin-set password; the mock API rejects it as recently used. */
export const RECENTLY_USED_DEMO_PASSWORD = 'Welcome123!'

export const STRENGTH_SEGMENT_COUNT = 5

export function evaluateRequirements(password: string): RequirementStatus[] {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    satisfied: requirement.test(password),
  }))
}

export function areAllRequirementsSatisfied(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password))
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: 'empty', metCount: 0, filledSegments: 0, label: '' }
  }

  const metCount = PASSWORD_REQUIREMENTS.filter((requirement) => requirement.test(password)).length
  const filledSegments = metCount

  if (metCount <= 2) {
    return { level: 'weak', metCount, filledSegments, label: 'Weak' }
  }
  if (metCount === 3) {
    return { level: 'fair', metCount, filledSegments, label: 'Fair' }
  }
  if (metCount === 4) {
    return { level: 'good', metCount, filledSegments, label: 'Good' }
  }

  return { level: 'strong', metCount, filledSegments, label: 'Strong' }
}

export function passwordsMatch(password: string, confirmation: string): boolean {
  return password.length > 0 && confirmation.length > 0 && password === confirmation
}

export function shouldShowConfirmMismatch(options: {
  password: string
  confirmation: string
  confirmBlurred: boolean
  submitAttempted: boolean
}): boolean {
  const { password, confirmation, confirmBlurred, submitAttempted } = options
  if (!confirmation || password === confirmation) return false
  if (submitAttempted || confirmBlurred) return true
  return password.length > 0 && confirmation.length >= password.length
}

export function shouldShowConfirmMatch(password: string, confirmation: string): boolean {
  return passwordsMatch(password, confirmation)
}

export function shouldShowPasswordRequirementsError(options: {
  password: string
  fieldBlurred: boolean
  submitAttempted: boolean
}): boolean {
  if (!options.submitAttempted && !options.fieldBlurred) return false
  if (!options.password) return options.submitAttempted
  return !areAllRequirementsSatisfied(options.password)
}

export function isFormValid(password: string, confirmation: string): boolean {
  return areAllRequirementsSatisfied(password) && passwordsMatch(password, confirmation)
}

export function getPasswordChangeReasonMessage(_reason?: string): string {
  return DEFAULT_PASSWORD_CHANGE_MESSAGE
}

export function isRecentlyUsedPassword(password: string): boolean {
  return password === RECENTLY_USED_DEMO_PASSWORD
}

export function getPasswordRequirementsErrorMessage(password: string): string {
  if (!password) return 'Enter a new password.'
  return "Your new password doesn't meet all requirements."
}

export async function submitPasswordChange(password: string): Promise<PasswordChangeResult> {
  await new Promise((resolve) => setTimeout(resolve, 1100))

  if (isRecentlyUsedPassword(password)) {
    return {
      ok: false,
      message: 'This password was used recently. Choose a different password.',
    }
  }

  return { ok: true }
}

export function useChangePassword() {
  const newPassword = ref('')
  const confirmPassword = ref('')
  const showNewPassword = ref(false)
  const showConfirmPassword = ref(false)
  const newPasswordBlurred = ref(false)
  const confirmPasswordBlurred = ref(false)
  const submitAttempted = ref(false)
  const status = ref<ChangePasswordStatus>('idle')
  const serverError = ref<string | null>(null)

  const requirements = computed(() => evaluateRequirements(newPassword.value))
  const strength = computed(() => getPasswordStrength(newPassword.value))
  const metCount = computed(() => requirements.value.filter((requirement) => requirement.satisfied).length)
  const allRequirementsMet = computed(() => areAllRequirementsSatisfied(newPassword.value))
  const isValid = computed(() => isFormValid(newPassword.value, confirmPassword.value))
  const isSubmitting = computed(() => status.value === 'submitting')
  const isSuccess = computed(() => status.value === 'success')

  const showRequirementsError = computed(() =>
    shouldShowPasswordRequirementsError({
      password: newPassword.value,
      fieldBlurred: newPasswordBlurred.value,
      submitAttempted: submitAttempted.value,
    }),
  )

  const showMismatch = computed(() =>
    shouldShowConfirmMismatch({
      password: newPassword.value,
      confirmation: confirmPassword.value,
      confirmBlurred: confirmPasswordBlurred.value,
      submitAttempted: submitAttempted.value,
    }),
  )

  const showMatch = computed(() => shouldShowConfirmMatch(newPassword.value, confirmPassword.value))

  const requirementsErrorMessage = computed(() =>
    showRequirementsError.value ? getPasswordRequirementsErrorMessage(newPassword.value) : '',
  )

  function onNewPasswordInput(): void {
    if (status.value === 'server-error') {
      status.value = 'idle'
      serverError.value = null
    }
  }

  function onNewPasswordBlur(): void {
    newPasswordBlurred.value = true
  }

  function onConfirmPasswordBlur(): void {
    confirmPasswordBlurred.value = true
  }

  async function submit(): Promise<boolean> {
    submitAttempted.value = true
    newPasswordBlurred.value = true
    confirmPasswordBlurred.value = true

    if (!isValid.value || isSubmitting.value || isSuccess.value) return false

    status.value = 'submitting'
    serverError.value = null

    const result = await submitPasswordChange(newPassword.value)
    if (!result.ok) {
      status.value = 'server-error'
      serverError.value = result.message ?? 'This password could not be used. Choose a different password.'
      return false
    }

    status.value = 'success'
    return true
  }

  return {
    newPassword,
    confirmPassword,
    showNewPassword,
    showConfirmPassword,
    status,
    serverError,
    requirements,
    strength,
    metCount,
    allRequirementsMet,
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
  }
}
