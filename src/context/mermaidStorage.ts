import type { CopyImageFontSize, LabelWrapAggressiveness } from '../utils/copyPreview';
import { sanitizeTokens } from '../lib/mermaidStyle';
import type { MermaidRenderMode, ThemeConfig } from './themeConfig';
import { DEFAULT_THEME_CONFIG } from './themeConfig';

export const RENDER_MODE_STORAGE_KEY = 'md-mermaid-render-mode';
export const THEME_CONFIG_STORAGE_KEY = 'md-mermaid-theme-config';
export const LABEL_WRAP_STORAGE_KEY = 'md-mermaid-label-wrap';
export const COPY_IMAGE_FONT_SIZE_STORAGE_KEY = 'md-mermaid-copy-image-font-size';
export const COPY_TARGET_STORAGE_KEY = 'md-mermaid-copy-target';
export const MERMAID_STYLE_STORAGE_KEY = 'md-mermaid-style';
export const STYLE_TOKENS_STORAGE_KEY = 'md-mermaid-style-tokens';

/** Stored design-token overrides. Unknown keys and blank values are dropped. */
export function loadStyleTokens(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STYLE_TOKENS_STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    return sanitizeTokens(Object.fromEntries(entries));
  } catch {
    return {};
  }
}

export function isValidRenderMode(value: string | null): value is MermaidRenderMode {
  return value === 'default' || value === 'beautiful-svg' || value === 'beautiful-ascii';
}

export function isValidLabelWrap(value: string | null): value is LabelWrapAggressiveness {
  return value === 'compact' || value === 'normal' || value === 'wide';
}

export function isValidCopyImageFontSize(value: string | null): value is CopyImageFontSize {
  return value === 'small' || value === 'normal' || value === 'large';
}

export function loadThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem(THEME_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ThemeConfig>;
      return { ...DEFAULT_THEME_CONFIG, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_THEME_CONFIG;
}
