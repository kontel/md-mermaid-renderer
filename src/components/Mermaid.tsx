import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { renderMermaidSVG, renderMermaidASCII } from 'beautiful-mermaid';
import { flowchartConfig } from '../config/flowchart';
import { useMermaidContext } from '../context/MermaidContext';
import type { MermaidRenderMode, ThemeConfig } from '../context/MermaidContext';
import { copyDiagramToClipboard, saveDiagramAsFile } from '../utils/copyPreview';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: flowchartConfig,
});

let mermaidId = 0;
function nextMermaidId() {
  return `mermaid-${Date.now()}-${mermaidId++}`;
}

function buildThemeOptions(config: ThemeConfig) {
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

function DiagramActions({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const { labelWrapAggressiveness, copyImageFontSize } = useMermaidContext();
  const [status, setStatus] = useState<'idle' | 'copied' | 'saved'>('idle');

  const onCopy = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await copyDiagramToClipboard(containerRef.current, labelWrapAggressiveness, copyImageFontSize);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef, labelWrapAggressiveness, copyImageFontSize]);

  const onSave = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await saveDiagramAsFile(containerRef.current, 'diagram.png', labelWrapAggressiveness, copyImageFontSize);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef, labelWrapAggressiveness, copyImageFontSize]);

  return (
    <div className="diagram-actions">
      <button type="button" className="diagram-actions-btn" onClick={onCopy} title="Copy as PNG">
        Copy
      </button>
      <button type="button" className="diagram-actions-btn" onClick={onSave} title="Save as PNG">
        Save
      </button>
      {status === 'copied' && <span className="diagram-actions-status">Copied!</span>}
      {status === 'saved' && <span className="diagram-actions-status">Saved!</span>}
    </div>
  );
}

function useBeautifulRender(chart: string, themeConfig: ThemeConfig, renderMode: MermaidRenderMode) {
  return useMemo(() => {
    if (renderMode === 'default' || !chart.trim()) return { svg: '', ascii: '', error: null as string | null };
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
  }, [chart, themeConfig, renderMode]);
}

export function Mermaid({ chart }: MermaidProps) {
  const { renderMode, themeConfig } = useMermaidContext();
  const containerRef = useRef<HTMLElement>(null);
  const [defaultSvg, setDefaultSvg] = useState<string>('');
  const [defaultError, setDefaultError] = useState<string | null>(null);

  const beautiful = useBeautifulRender(chart, themeConfig, renderMode);

  useEffect(() => {
    if (renderMode !== 'default') return;
    if (!chart.trim()) {
      queueMicrotask(() => {
        setDefaultSvg('');
        setDefaultError(null);
      });
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const id = nextMermaidId();
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) {
          setDefaultSvg(svg);
          setDefaultError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDefaultError(err instanceof Error ? err.message : 'Failed to render diagram');
          setDefaultSvg('');
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [chart, renderMode]);

  const svg = renderMode === 'default' ? defaultSvg : beautiful.svg;
  const ascii = beautiful.ascii;
  const error = renderMode === 'default' ? defaultError : beautiful.error;

  if (error) {
    return (
      <div className="mermaid-error">
        <strong>Mermaid Error:</strong> {error}
      </div>
    );
  }

  if (renderMode === 'beautiful-ascii' && ascii) {
    return (
      <div className="mermaid-block">
        <pre ref={containerRef as React.RefObject<HTMLPreElement | null>} className="mermaid-ascii">
          {ascii}
        </pre>
        <DiagramActions containerRef={containerRef} />
      </div>
    );
  }

  return (
    <div className="mermaid-block">
      <div
        ref={containerRef as React.RefObject<HTMLDivElement | null>}
        className="mermaid-container"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <DiagramActions containerRef={containerRef} />
    </div>
  );
}
