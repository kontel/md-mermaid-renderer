import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { flowchartConfig } from '../config/flowchart';
import { useMermaidContext } from '../context/MermaidContext';
import { computeBeautifulRender } from '../lib/mermaidTheme';
import { DiagramActions } from './DiagramActions';

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

export function Mermaid({ chart }: MermaidProps) {
  const { renderMode, themeConfig } = useMermaidContext();
  const containerRef = useRef<HTMLElement>(null);
  const [defaultSvg, setDefaultSvg] = useState<string>('');
  const [defaultError, setDefaultError] = useState<string | null>(null);

  const beautiful = useMemo(
    () => computeBeautifulRender(chart, themeConfig, renderMode),
    [chart, themeConfig, renderMode],
  );

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
