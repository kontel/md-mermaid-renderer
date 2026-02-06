import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { renderMermaid, renderMermaidAscii } from 'beautiful-mermaid';
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

/**
 * Normalize root <svg> so all diagram types render at consistent scale.
 * - Use a fixed reference width (800) so large viewBoxes (e.g. class diagrams)
 *   don't get huge intrinsic size and then scale down to tiny text.
 * - Strip any existing width/height and set normalized size so flowchart,
 *   sequence, and class diagrams all scale the same.
 */
const REFERENCE_SVG_WIDTH = 800;

function ensureSvgDimensions(svgString: string): string {
  const viewBoxMatch = svgString.match(/<svg[^>]*\sviewBox=["']([^"']+)["']/i);
  if (!viewBoxMatch) return svgString;
  const parts = viewBoxMatch[1].trim().split(/\s+/);
  const vbWidth = parts[2] ? parseFloat(parts[2]) : 0;
  const vbHeight = parts[3] ? parseFloat(parts[3]) : 0;
  if (!(vbWidth > 0 && vbHeight > 0)) return svgString;

  const refW = REFERENCE_SVG_WIDTH;
  const refH = Math.round(refW * (vbHeight / vbWidth));

  return svgString.replace(/<svg\s*([^>]*)>/, (_match, attrs: string) => {
    const cleaned = (attrs || '')
      .replace(/\s*width\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*height\s*=\s*["'][^"']*["']/gi, '')
      .trim();
    const rest = cleaned ? ` ${cleaned}` : '';
    return `<svg${rest} width="${refW}" height="${refH}">`;
  });
}

// Inline SVG icon components (no external deps)
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" />
      <path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5" />
      <path d="M2 11v2.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V11" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

type ActionStatus = 'idle' | 'done' | 'failed';

function DiagramToolbar({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const [copyStatus, setCopyStatus] = useState<ActionStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<ActionStatus>('idle');

  const handleCopy = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await copyDiagramToClipboard(containerRef.current);
      setCopyStatus('done');
    } catch {
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  }, [containerRef]);

  const handleSave = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await saveDiagramAsFile(containerRef.current, `mermaid-diagram-${Date.now()}.png`);
      setSaveStatus('done');
    } catch {
      setSaveStatus('failed');
    }
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [containerRef]);

  const copyIcon = copyStatus === 'done' ? <CheckIcon /> : copyStatus === 'failed' ? <XIcon /> : <CopyIcon />;
  const saveIcon = saveStatus === 'done' ? <CheckIcon /> : saveStatus === 'failed' ? <XIcon /> : <SaveIcon />;
  const copyLabel = copyStatus === 'done' ? 'Copied' : copyStatus === 'failed' ? 'Failed' : 'Copy';
  const saveLabel = saveStatus === 'done' ? 'Saved' : saveStatus === 'failed' ? 'Failed' : 'Save';

  return (
    <div className="diagram-toolbar">
      <button
        className={`diagram-toolbar-btn ${copyStatus !== 'idle' ? `diagram-toolbar-btn--${copyStatus}` : ''}`}
        onClick={handleCopy}
        aria-label="Copy diagram to clipboard"
        title="Copy to clipboard"
      >
        {copyIcon}
        <span className="diagram-toolbar-label">{copyLabel}</span>
      </button>
      <button
        className={`diagram-toolbar-btn ${saveStatus !== 'idle' ? `diagram-toolbar-btn--${saveStatus}` : ''}`}
        onClick={handleSave}
        aria-label="Save diagram as PNG"
        title="Save as PNG"
      >
        {saveIcon}
        <span className="diagram-toolbar-label">{saveLabel}</span>
      </button>
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
          const { svg: rawSvg } = await mermaid.render(id, chart);
          setSvg(ensureSvgDimensions(rawSvg));
          setAscii('');
          setError(null);
        } else if (renderMode === 'beautiful-svg') {
          const themeOptions = buildThemeOptions(themeConfig);
          const svgResult = await renderMermaid(chart, themeOptions);
          setSvg(ensureSvgDimensions(svgResult));
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
      <div className="mermaid-wrapper">
        <pre ref={containerRef as React.RefObject<HTMLPreElement | null>} className="mermaid-ascii" role="img" aria-label="Mermaid diagram (ASCII)">
          {ascii}
        </pre>
        <DiagramToolbar containerRef={containerRef} />
      </div>
    );
  }

  return (
    <div className="mermaid-wrapper">
      <div
        ref={containerRef as React.RefObject<HTMLDivElement | null>}
        className="mermaid-container"
        role="img"
        aria-label="Mermaid diagram"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <DiagramToolbar containerRef={containerRef} />
    </div>
  );
}
