export type MermaidRenderMode = 'default' | 'beautiful-svg' | 'beautiful-ascii';

export const THEME_PRESETS = [
  'zinc-light',
  'tokyo-night-light',
  'catppuccin-latte',
  'nord-light',
  'github-light',
  'solarized-light',
  'zinc-dark',
  'tokyo-night',
  'tokyo-night-storm',
  'catppuccin-mocha',
  'nord',
  'dracula',
  'github-dark',
  'solarized-dark',
  'one-dark',
] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number] | 'custom';

export interface ThemeConfig {
  preset: ThemePreset;
  bg: string;
  fg: string;
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
  font?: string;
  transparent?: boolean;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  preset: 'custom',
  bg: '#1a1b26',
  fg: '#a9b1d6',
  line: '#565f89',
  accent: '#7aa2f7',
  muted: '#565f89',
  surface: '#24283b',
  border: '#414868',
  font: 'Inter',
  transparent: false,
};
