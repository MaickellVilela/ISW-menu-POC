/**
 * Code-first design tokens extracted from the existing UI.
 * Product screens still use hardcoded hex classes; new work can use
 * these names via Tailwind (`bg-brand`, `text-ink`, …).
 */

export type ColorToken = {
  name: string;
  /** Tailwind theme key, e.g. `brand` → `bg-brand`. */
  key: string;
  hex: string;
  usage: string;
  /** Contrast vs white is only meaningful for colors used as text. */
  usedAs: 'text' | 'fill';
};

export const brandColors: ColorToken[] = [
  { name: 'Brand', key: 'brand', hex: '#3B1770', usage: 'Primary buttons, focus rings, active accents', usedAs: 'text' },
  { name: 'Brand hover', key: 'brand-hover', hex: '#4B1E8C', usage: 'Pressed / hover purple', usedAs: 'text' },
  { name: 'Brand accent', key: 'brand-accent', hex: '#6F42A5', usage: 'Secondary purple accent, selected borders', usedAs: 'text' },
  { name: 'Brand tint', key: 'brand-tint', hex: '#F8F6FC', usage: 'Hover surfaces', usedAs: 'fill' },
  { name: 'Brand tint 100', key: 'brand-tint-100', hex: '#F5F1FC', usage: 'Selected-row hover', usedAs: 'fill' },
  { name: 'Brand tint 200', key: 'brand-tint-200', hex: '#F1ECFA', usage: 'Selected surfaces', usedAs: 'fill' },
];

export const neutralColors: ColorToken[] = [
  { name: 'Ink', key: 'ink', hex: '#25262E', usage: 'Headings, body text, sidebar', usedAs: 'text' },
  { name: 'Muted', key: 'muted', hex: '#6B6B6B', usage: 'Secondary text', usedAs: 'text' },
  { name: 'Subtle', key: 'subtle', hex: '#9A9A9A', usage: 'Tertiary text and icons', usedAs: 'text' },
  { name: 'Border', key: 'line', hex: '#E2E2E2', usage: 'Default borders', usedAs: 'fill' },
  { name: 'Canvas', key: 'canvas', hex: '#F1F1F1', usage: 'App background', usedAs: 'fill' },
  { name: 'White', key: 'surface', hex: '#FFFFFF', usage: 'Cards and panels', usedAs: 'fill' },
];

export const statusColors: ColorToken[] = [
  { name: 'Danger', key: 'danger', hex: '#B42318', usage: 'Error text and destructive actions', usedAs: 'text' },
  { name: 'Success', key: 'success', hex: '#166534', usage: 'Success text and confirmation', usedAs: 'text' },
];

export const colorTokens: ColorToken[] = [
  ...brandColors,
  ...neutralColors,
  ...statusColors,
];

/** Flat map for Tailwind `theme.extend.colors`. */
export const tailwindColors: Record<string, string> = Object.fromEntries(
  colorTokens.map((token) => [token.key, token.hex]),
);

export type TypeToken = {
  name: string;
  className: string;
  size: string;
  weight: string;
  usage: string;
};

export const typographyTokens: TypeToken[] = [
  { name: 'Caption', className: 'text-[11px]', size: '11px', weight: '400', usage: 'Field labels, compact UI' },
  { name: 'Meta', className: 'text-xs', size: '12px', weight: '400', usage: 'Helper text, timestamps' },
  { name: 'Body compact', className: 'text-[13px]', size: '13px', weight: '500', usage: 'List rows, card titles' },
  { name: 'Body', className: 'text-sm', size: '14px', weight: '400', usage: 'Default body copy' },
  { name: 'Title', className: 'text-xl', size: '20px', weight: '600', usage: 'Page headings' },
];

export type SpaceToken = {
  name: string;
  key: string;
  px: number;
  usage: string;
};

export const spacingTokens: SpaceToken[] = [
  { name: '2xs', key: '1', px: 4, usage: 'Tight icon gaps' },
  { name: 'xs', key: '1.5', px: 6, usage: 'Compact control padding' },
  { name: 'sm', key: '2', px: 8, usage: 'Button / row padding (py-2)' },
  { name: 'md', key: '2.5', px: 10, usage: 'Card row padding' },
  { name: 'lg', key: '3', px: 12, usage: 'Default panel padding (px-3)' },
  { name: 'xl', key: '4', px: 16, usage: 'Section gaps' },
  { name: '2xl', key: '6', px: 24, usage: 'Page-level spacing' },
];
