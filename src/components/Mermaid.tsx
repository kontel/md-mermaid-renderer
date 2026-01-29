import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { renderMermaid, renderMermaidAscii } from 'beautiful-mermaid';
import { useMermaidContext } from '../context/MermaidContext';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

let mermaidId = 0;

export function Mermaid({ chart }: MermaidProps) {
  const { renderMode } = useMermaidContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [ascii, setAscii] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${mermaidId++}`);

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
          const { svg } = await mermaid.render(idRef.current, chart);
          setSvg(svg);
          setAscii('');
          setError(null);
        } else if (renderMode === 'beautiful-svg') {
          const svgResult = await renderMermaid(chart);
          setSvg(svgResult);
          setAscii('');
          setError(null);
        } else if (renderMode === 'beautiful-ascii') {
          const asciiResult = renderMermaidAscii(chart);
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
  }, [chart, renderMode]);

  if (error) {
    return (
      <div className="mermaid-error">
        <strong>Mermaid Error:</strong> {error}
      </div>
    );
  }

  if (renderMode === 'beautiful-ascii' && ascii) {
    return (
      <pre className="mermaid-ascii">
        {ascii}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
