export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover disabled:bg-brand/40 disabled:hover:bg-brand/40',
  secondary:
    'bg-transparent text-brand hover:bg-brand-tint-100 disabled:text-brand/40 disabled:hover:bg-transparent',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
};

const BASE =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed';

/** Class list for the product Button. Isolated so stories (and later tests) can reuse it. */
export function buttonClassNames(variant: ButtonVariant, size: ButtonSize): string {
  return [BASE, VARIANT[variant], SIZE[size]].join(' ');
}
