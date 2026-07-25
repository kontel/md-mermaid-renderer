import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { CopyImageFontSize, LabelWrapAggressiveness } from '../utils/copyPreview';
import { isValidCopyTarget } from '../lib/copyTargets';
import type { CopyTarget } from '../lib/copyTargets';
import { DEFAULT_MERMAID_STYLE, isValidMermaidStyle, sanitizeTokens } from '../lib/mermaidStyle';
import type { MermaidStyleId } from '../lib/mermaidStyle';
import {
  RENDER_MODE_STORAGE_KEY,
  THEME_CONFIG_STORAGE_KEY,
  LABEL_WRAP_STORAGE_KEY,
  COPY_IMAGE_FONT_SIZE_STORAGE_KEY,
  COPY_TARGET_STORAGE_KEY,
  MERMAID_STYLE_STORAGE_KEY,
  STYLE_TOKENS_STORAGE_KEY,
  isValidRenderMode,
  isValidLabelWrap,
  isValidCopyImageFontSize,
  loadThemeConfig,
  loadStyleTokens,
} from './mermaidStorage';
import type { MermaidRenderMode, ThemeConfig } from './themeConfig';

export type { MermaidRenderMode, ThemePreset, ThemeConfig } from './themeConfig';
export { THEME_PRESETS } from './themeConfig';

interface MermaidContextType {
  renderMode: MermaidRenderMode;
  setRenderMode: (mode: MermaidRenderMode) => void;
  themeConfig: ThemeConfig;
  setThemeConfig: (config: ThemeConfig) => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  labelWrapAggressiveness: LabelWrapAggressiveness;
  setLabelWrapAggressiveness: (mode: LabelWrapAggressiveness) => void;
  copyImageFontSize: CopyImageFontSize;
  setCopyImageFontSize: (size: CopyImageFontSize) => void;
  copyTarget: CopyTarget;
  setCopyTarget: (target: CopyTarget) => void;
  /** Visual style for the mermaid.js renderer. */
  mermaidStyleId: MermaidStyleId;
  setMermaidStyleId: (id: MermaidStyleId) => void;
  /** Design-token overrides layered on top of the selected style. */
  styleTokens: Record<string, string>;
  setStyleTokens: (tokens: Record<string, string>) => void;
}

const MermaidContext = createContext<MermaidContextType | undefined>(undefined);

export function MermaidProvider({ children }: { children: ReactNode }) {
  const [renderMode, setRenderMode] = useState<MermaidRenderMode>(() => {
    const stored = localStorage.getItem(RENDER_MODE_STORAGE_KEY);
    return isValidRenderMode(stored) ? stored : 'default';
  });

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(loadThemeConfig);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [labelWrapAggressiveness, setLabelWrapAggressiveness] = useState<LabelWrapAggressiveness>(() => {
    const stored = localStorage.getItem(LABEL_WRAP_STORAGE_KEY);
    return isValidLabelWrap(stored) ? stored : 'normal';
  });
  const [copyImageFontSize, setCopyImageFontSize] = useState<CopyImageFontSize>(() => {
    const stored = localStorage.getItem(COPY_IMAGE_FONT_SIZE_STORAGE_KEY);
    return isValidCopyImageFontSize(stored) ? stored : 'normal';
  });

  const [copyTarget, setCopyTarget] = useState<CopyTarget>(() => {
    const stored = localStorage.getItem(COPY_TARGET_STORAGE_KEY);
    return isValidCopyTarget(stored) ? stored : 'rich';
  });

  useEffect(() => {
    localStorage.setItem(RENDER_MODE_STORAGE_KEY, renderMode);
  }, [renderMode]);

  const [mermaidStyleId, setMermaidStyleId] = useState<MermaidStyleId>(() => {
    const stored = localStorage.getItem(MERMAID_STYLE_STORAGE_KEY);
    return isValidMermaidStyle(stored) ? stored : DEFAULT_MERMAID_STYLE;
  });

  const [styleTokens, setStyleTokensRaw] = useState<Record<string, string>>(loadStyleTokens);
  const setStyleTokens = (tokens: Record<string, string>) =>
    setStyleTokensRaw(sanitizeTokens(tokens));

  useEffect(() => {
    localStorage.setItem(COPY_TARGET_STORAGE_KEY, copyTarget);
  }, [copyTarget]);

  useEffect(() => {
    localStorage.setItem(MERMAID_STYLE_STORAGE_KEY, mermaidStyleId);
  }, [mermaidStyleId]);

  useEffect(() => {
    localStorage.setItem(STYLE_TOKENS_STORAGE_KEY, JSON.stringify(styleTokens));
  }, [styleTokens]);

  useEffect(() => {
    localStorage.setItem(LABEL_WRAP_STORAGE_KEY, labelWrapAggressiveness);
  }, [labelWrapAggressiveness]);

  useEffect(() => {
    localStorage.setItem(COPY_IMAGE_FONT_SIZE_STORAGE_KEY, copyImageFontSize);
  }, [copyImageFontSize]);

  useEffect(() => {
    localStorage.setItem(THEME_CONFIG_STORAGE_KEY, JSON.stringify(themeConfig));
  }, [themeConfig]);

  return (
    <MermaidContext.Provider
      value={{
        renderMode,
        setRenderMode,
        themeConfig,
        setThemeConfig,
        isDrawerOpen,
        setDrawerOpen,
        labelWrapAggressiveness,
        setLabelWrapAggressiveness,
        copyImageFontSize,
        setCopyImageFontSize,
        copyTarget,
        setCopyTarget,
        mermaidStyleId,
        setMermaidStyleId,
        styleTokens,
        setStyleTokens,
      }}
    >
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
