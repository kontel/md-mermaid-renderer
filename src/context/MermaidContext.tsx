import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type MermaidRenderMode = 'default' | 'beautiful-svg' | 'beautiful-ascii';

const RENDER_MODE_STORAGE_KEY = 'md-mermaid-render-mode';

interface MermaidContextType {
  renderMode: MermaidRenderMode;
  setRenderMode: (mode: MermaidRenderMode) => void;
}

const MermaidContext = createContext<MermaidContextType | undefined>(undefined);

function isValidRenderMode(value: string | null): value is MermaidRenderMode {
  return value === 'default' || value === 'beautiful-svg' || value === 'beautiful-ascii';
}

export function MermaidProvider({ children }: { children: ReactNode }) {
  const [renderMode, setRenderMode] = useState<MermaidRenderMode>(() => {
    const stored = localStorage.getItem(RENDER_MODE_STORAGE_KEY);
    return isValidRenderMode(stored) ? stored : 'default';
  });

  useEffect(() => {
    localStorage.setItem(RENDER_MODE_STORAGE_KEY, renderMode);
  }, [renderMode]);

  return (
    <MermaidContext.Provider value={{ renderMode, setRenderMode }}>
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
