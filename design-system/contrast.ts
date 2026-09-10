/**
 * WCAG 2 contrast helpers. Isolated so the Colors story (and later tests)
 * can flag pairs that fail AA without depending on Storybook.
 */

type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channelLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Contrast ratio of two hex colors, 1–21. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAa(
  foreground: string,
  background: string,
  largeText = false,
): boolean {
  return contrastRatio(foreground, background) >= (largeText ? 3 : 4.5);
}

export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
