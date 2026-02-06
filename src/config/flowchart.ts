/**
 * Shared flowchart config so display (Mermaid) and copy-image (PNG export) use the same paddings.
 */

export const FLOWCHART_PADDING = 24;
export const FLOWCHART_SUBGRAPH_TITLE_MARGIN = { top: 14, bottom: 25 } as const;
export const FLOWCHART_WRAPPING_WIDTH = 250;

export const flowchartConfig = {
  padding: FLOWCHART_PADDING,
  subGraphTitleMargin: FLOWCHART_SUBGRAPH_TITLE_MARGIN,
  htmlLabels: true,
  wrappingWidth: FLOWCHART_WRAPPING_WIDTH,
} as const;
