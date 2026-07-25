/**
 * Shared flowchart config so display (Mermaid) and copy-image (PNG export) use the same paddings.
 */

// Keep outer padding modest; reserve more space under subgraph titles for multiline labels.
export const FLOWCHART_PADDING = 15;
export const FLOWCHART_SUBGRAPH_TITLE_MARGIN = { top: 5, bottom: 35 } as const;
export const FLOWCHART_WRAPPING_WIDTH = 250;

export const flowchartConfig = {
  padding: FLOWCHART_PADDING,
  subGraphTitleMargin: FLOWCHART_SUBGRAPH_TITLE_MARGIN,
  wrappingWidth: FLOWCHART_WRAPPING_WIDTH,
} as const;

/**
 * Label rendering. Root-level since mermaid 11.13 — the per-diagram
 * `flowchart.htmlLabels` is deprecated and the root value overrides it anyway.
 *
 * Kept `true`: HTML labels are what give `<br/>` and markdown in node text. The
 * PNG export rewrites the resulting `<foreignObject>` into SVG `<text>` because
 * foreignObject taints a canvas.
 */
export const HTML_LABELS = true;
