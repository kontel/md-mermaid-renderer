import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { flowchartConfig, HTML_LABELS } from '../config/flowchart';
import { useMermaidContext } from '../context/MermaidContext';
import { liftClusterLabels } from '../lib/clusterLabels';
import { computeBeautifulRender } from '../lib/mermaidTheme';
import { buildMermaidStyleConfig, styleConfigKey } from '../lib/mermaidStyle';
import { DiagramActions } from './DiagramActions';

/**
 * Below this fit-to-width scale a 16px label shrinks under ~10px — the point
 * where the preview stops being readable and an "actual size" view earns a button.
 */
const LEGIBLE_FIT_SCALE = 0.6;

interface MermaidProps {
  chart: string;
}

/** Everything except the visual style, which is re-applied per render. */
const BASE_CONFIG = {
  startOnLoad: false,
  securityLevel: 'loose' as const,
  htmlLabels: HTML_LABELS,
  flowchart: flowchartConfig,
};

mermaid.initialize({ ...BASE_CONFIG, theme: 'default' });

/**
 * Registers every built-in diagram detector before the first render.
 *
 * Newer diagram types (venn, cynefin, swimlane, treeView, wardley, ishikawa,
 * railroad) are registered lazily. A page that mounts several diagrams at once
 * fires their `render` calls concurrently, and the ones that land before
 * registration completes fail with "No diagram type detected" — they only
 * appear after navigating away and back. Awaiting this first makes a cold load
 * behave like a warm one.
 *
 * `lazyLoad: true` keeps the per-diagram chunks on demand; only the detectors
 * are registered up front.
 */
const mermaidReady: Promise<void> = mermaid
  .registerExternalDiagrams([], { lazyLoad: true })
  .catch(() => undefined);

let mermaidId = 0;
function nextMermaidId() {
  return `mermaid-${Date.now()}-${mermaidId++}`;
}

export function Mermaid({ chart }: MermaidProps) {
  const { renderMode, themeConfig, mermaidStyleId, styleTokens } = useMermaidContext();
  const containerRef = useRef<HTMLElement>(null);
  const [defaultSvg, setDefaultSvg] = useState<string>('');
  const [defaultError, setDefaultError] = useState<string | null>(null);

  const beautiful = useMemo(
    () => computeBeautifulRender(chart, themeConfig, renderMode),
    [chart, themeConfig, renderMode],
  );

  /**
   * beautiful-mermaid only understands the flowchart family. Rather than showing
   * an error for a gantt or a mindmap, fall back to mermaid.js — a diagram in the
   * wrong style beats no diagram.
   */
  const isFallback = renderMode !== 'default' && beautiful.error !== null;
  const usesMermaidJs = renderMode === 'default' || isFallback;

  // A plain string, so the effect re-runs on a real style change rather than on
  // every render (the config object is rebuilt each time).
  const styleKey = styleConfigKey(mermaidStyleId, styleTokens);

  useEffect(() => {
    if (!usesMermaidJs) return;
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
        await mermaidReady;
        if (cancelled) return;
        // Config is global in mermaid, and every diagram on the page shares this
        // style, so re-applying it before each render is idempotent.
        mermaid.initialize({ ...BASE_CONFIG, ...buildMermaidStyleConfig(mermaidStyleId, styleTokens) });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- styleKey stands in for mermaidStyleId + styleTokens
  }, [chart, usesMermaidJs, styleKey]);

  const svg = usesMermaidJs ? defaultSvg : beautiful.svg;
  const error = usesMermaidJs ? defaultError : beautiful.error;

  // Before paint, so a title never flashes under an edge. React leaves the
  // injected markup alone until `svg` changes, so the move survives re-renders.
  useLayoutEffect(() => {
    const svgEl = containerRef.current?.querySelector<SVGSVGElement>(':scope > svg');
    if (svgEl && usesMermaidJs) liftClusterLabels(svgEl);
  }, [svg, usesMermaidJs]);

  const [fitScale, setFitScale] = useState(1);
  const [actualSize, setActualSize] = useState(false);

  // How far the pane squeezes the diagram, kept current as the split is dragged.
  useEffect(() => {
    const container = containerRef.current;
    const naturalWidth = container?.querySelector<SVGSVGElement>(':scope > svg')?.viewBox.baseVal?.width;
    if (!container || !naturalWidth) return;
    container.style.setProperty('--diagram-width', `${naturalWidth}px`);
    const measure = () => {
      const style = getComputedStyle(container);
      const inner = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setFitScale(Math.min(1, inner / naturalWidth));
    };
    // ResizeObserver only reports on a rendered frame, which a backgrounded tab
    // never produces — measure once up front so the toggle does not wait for one.
    queueMicrotask(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [svg]);

  const canZoom = fitScale < LEGIBLE_FIT_SCALE;
  const zoomed = canZoom && actualSize;

  if (error) {
    return (
      <div className="mermaid-error">
        <strong>Mermaid Error:</strong> {error}
      </div>
    );
  }

  if (renderMode === 'beautiful-ascii' && beautiful.ascii) {
    return (
      <div className="mermaid-block">
        <pre ref={containerRef as React.RefObject<HTMLPreElement | null>} className="mermaid-ascii">
          {beautiful.ascii}
        </pre>
        <DiagramActions containerRef={containerRef} />
      </div>
    );
  }

  return (
    <div className="mermaid-block">
      <div
        ref={containerRef as React.RefObject<HTMLDivElement | null>}
        className={zoomed ? 'mermaid-container mermaid-container--actual' : 'mermaid-container'}
        // Scrollable at actual size, so it must be reachable by keyboard.
        tabIndex={zoomed ? 0 : undefined}
        role={zoomed ? 'region' : undefined}
        aria-label={zoomed ? 'Diagram at actual size, scrollable' : undefined}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mermaid-block-footer">
        {isFallback && (
          <span className="mermaid-fallback-note" title="This renderer only supports the flowchart family">
            Rendered with mermaid.js
          </span>
        )}
        <DiagramActions containerRef={containerRef}>
          {canZoom && (
            <button
              type="button"
              className="diagram-actions-btn"
              onClick={() => setActualSize((v) => !v)}
              aria-pressed={zoomed}
              title={
                zoomed
                  ? 'Shrink the diagram to fit the pane'
                  : `Shown at ${Math.round(fitScale * 100)}% — view at actual size and scroll`
              }
            >
              {zoomed ? 'Fit width' : `Actual size (${Math.round(fitScale * 100)}%)`}
            </button>
          )}
        </DiagramActions>
      </div>
    </div>
  );
}
