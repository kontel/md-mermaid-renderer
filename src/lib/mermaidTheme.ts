import { renderMermaidSVG, renderMermaidASCII } from 'beautiful-mermaid';
import type { MermaidRenderMode, ThemeConfig } from '../context/themeConfig';

export interface BeautifulRenderResult {
  svg: string;
  ascii: string;
  error: string | null;
}

/**
 * Build theme options for beautiful-mermaid from ThemeConfig.
 * Pure function, safe to unit test.
 */
export function buildThemeOptions(config: ThemeConfig): Record<string, string | boolean | undefined> {
  const options: Record<string, string | boolean | undefined> = {
    bg: config.bg,
    fg: config.fg,
  };

  if (config.line) options.line = config.line;
  if (config.accent) options.accent = config.accent;
  if (config.muted) options.muted = config.muted;
  if (config.surface) options.surface = config.surface;
  if (config.border) options.border = config.border;
  if (config.font) options.font = config.font;
  if (config.transparent) options.transparent = config.transparent;

  return options;
}

/**
 * Compute beautiful-mermaid SVG or ASCII result for a chart.
 * Pure function (no React, no mermaid.init). Returns empty/error for default mode or empty chart.
 */
export function computeBeautifulRender(
  chart: string,
  themeConfig: ThemeConfig,
  renderMode: MermaidRenderMode,
): BeautifulRenderResult {
  if (renderMode === 'default' || !chart.trim()) {
    return { svg: '', ascii: '', error: null };
  }
  try {
    const themeOptions = buildThemeOptions(themeConfig);
    if (renderMode === 'beautiful-svg') {
      const svgResult = renderMermaidSVG(chart, themeOptions);
      return { svg: svgResult, ascii: '', error: null };
    }
    const asciiTheme: Record<string, string | undefined> = {
      fg: themeConfig.fg,
      border: themeConfig.border ?? themeConfig.line,
      line: themeConfig.line ?? themeConfig.muted,
      arrow: themeConfig.accent,
      corner: themeConfig.line ?? themeConfig.muted,
      junction: themeConfig.border ?? themeConfig.line,
    };
    const asciiResult = renderMermaidASCII(chart, { theme: asciiTheme, colorMode: 'html' });
    return { svg: '', ascii: asciiResult, error: null };
  } catch (err) {
    return {
      svg: '',
      ascii: '',
      error: err instanceof Error ? err.message : 'Failed to render diagram',
    };
  }
}
