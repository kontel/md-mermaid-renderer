import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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

export type ThemePreset = typeof THEME_PRESETS[number] | 'custom';

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

const DEFAULT_THEME_CONFIG: ThemeConfig = {
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

const RENDER_MODE_STORAGE_KEY = 'md-mermaid-render-mode';
const THEME_CONFIG_STORAGE_KEY = 'md-mermaid-theme-config';

interface MermaidContextType {
  renderMode: MermaidRenderMode;
  setRenderMode: (mode: MermaidRenderMode) => void;
  themeConfig: ThemeConfig;
  setThemeConfig: (config: ThemeConfig) => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const MermaidContext = createContext<MermaidContextType | undefined>(undefined);

function isValidRenderMode(value: string | null): value is MermaidRenderMode {
  return value === 'default' || value === 'beautiful-svg' || value === 'beautiful-ascii';
}

function loadThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem(THEME_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_THEME_CONFIG, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_THEME_CONFIG;
}

export function MermaidProvider({ children }: { children: ReactNode }) {
  const [renderMode, setRenderMode] = useState<MermaidRenderMode>(() => {
    const stored = localStorage.getItem(RENDER_MODE_STORAGE_KEY);
    return isValidRenderMode(stored) ? stored : 'default';
  });

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(loadThemeConfig);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(RENDER_MODE_STORAGE_KEY, renderMode);
  }, [renderMode]);

  useEffect(() => {
    localStorage.setItem(THEME_CONFIG_STORAGE_KEY, JSON.stringify(themeConfig));
  }, [themeConfig]);

  return (
    <MermaidContext.Provider value={{
      renderMode,
      setRenderMode,
      themeConfig,
      setThemeConfig,
      isDrawerOpen,
      setDrawerOpen
    }}>
      {children}
    </MermaidContext.Provider>
  );
}

export function useMermaidContext() {
  const context = useContext(MermaidContext);
  if (context === undefined) {
    throw new Error('useMermaidContext must be used within a MermaidProvider');
  }
  return context;
}
