import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { renderMermaid, renderMermaidAscii } from 'beautiful-mermaid';
import { useMermaidContext } from '../context/MermaidContext';
import type { ThemeConfig } from '../context/MermaidContext';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
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

export function Mermaid({ chart }: MermaidProps) {
  const { renderMode, themeConfig } = useMermaidContext();
  const containerRef = useRef<HTMLDivElement>(null);
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
          const { svg: rawSvg } = await mermaid.render(id, chart);
          setSvg(rawSvg);
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
      <pre className="mermaid-ascii" role="img" aria-label="Mermaid diagram (ASCII)">
        {ascii}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      role="img"
      aria-label="Mermaid diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
