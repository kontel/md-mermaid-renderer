import { useCallback, useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { renderMermaid, renderMermaidAscii } from 'beautiful-mermaid';
import { flowchartConfig } from '../config/flowchart';
import { useMermaidContext } from '../context/MermaidContext';
import type { ThemeConfig } from '../context/MermaidContext';
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
  const [status, setStatus] = useState<'idle' | 'copied' | 'saved'>('idle');

  const onCopy = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await copyDiagramToClipboard(containerRef.current);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef]);

  const onSave = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await saveDiagramAsFile(containerRef.current);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  }, [containerRef]);

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

export function Mermaid({ chart }: MermaidProps) {
  const { renderMode, themeConfig } = useMermaidContext();
  const containerRef = useRef<HTMLElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [ascii, setAscii] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart.trim()) {
        setSvg('');
        setAscii('');
        setError(null);
        return;
      }

      try {
        if (renderMode === 'default') {
          const id = nextMermaidId();
          const { svg } = await mermaid.render(id, chart);
          setSvg(svg);
          setAscii('');
          setError(null);
        } else if (renderMode === 'beautiful-svg') {
          const themeOptions = buildThemeOptions(themeConfig);
          const svgResult = await renderMermaid(chart, themeOptions);
          setSvg(svgResult);
          setAscii('');
          setError(null);
        } else if (renderMode === 'beautiful-ascii') {
          const themeOptions = buildThemeOptions(themeConfig);
          const asciiResult = renderMermaidAscii(chart, themeOptions);
          setAscii(asciiResult);
          setSvg('');
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
        setAscii('');
      }
    };

    renderChart();
  }, [chart, renderMode, themeConfig]);

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
