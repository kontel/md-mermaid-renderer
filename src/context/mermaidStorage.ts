import type { CopyImageFontSize, LabelWrapAggressiveness } from '../utils/copyPreview';
import type { MermaidRenderMode, ThemeConfig } from './themeConfig';
import { DEFAULT_THEME_CONFIG } from './themeConfig';

export const RENDER_MODE_STORAGE_KEY = 'md-mermaid-render-mode';
export const THEME_CONFIG_STORAGE_KEY = 'md-mermaid-theme-config';
export const LABEL_WRAP_STORAGE_KEY = 'md-mermaid-label-wrap';
export const COPY_IMAGE_FONT_SIZE_STORAGE_KEY = 'md-mermaid-copy-image-font-size';
export const COPY_TARGET_STORAGE_KEY = 'md-mermaid-copy-target';

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
