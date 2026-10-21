/**
 * How big a copied diagram image should be — on the page and in pixels.
 *
 * The size is driven by the diagram's own label font, not its width alone. A
 * diagram drawn with 16px labels displays at whatever scale puts those labels at
 * the requested text size, then shrinks further only if the target cannot fit
 * it. The PNG carries enough pixels to stay sharp at that size on a retina
 * screen *and* to stay legible when a recipient opens a shrunk diagram at 100%,
 * within the target's payload budget.
 *
 * Pure arithmetic, so the curve can be pinned by tests.
 */

/** Text size for copied diagram images, picked in the copy settings. */
export type CopyImageFontSize = 'small' | 'normal' | 'large';

/** On-page label size (CSS px) each setting aims for. */
export const COPY_IMAGE_TEXT_PX: Record<CopyImageFontSize, number> = {
  small: 12,
  normal: 14,
  large: 16,
};

/** mermaid's stock label size; used when a diagram exposes no text to measure. */
export const DEFAULT_DIAGRAM_FONT_PX = 16;

/** Never blow a diagram up or crush it by more than this to hit the text size. */
const MIN_TEXT_SCALE = 0.5;
const MAX_TEXT_SCALE = 1.5;

/**
 * Canvas limits. 16384 is the per-side ceiling in Chrome and Firefox; the area
 * cap is Safari's, and also keeps a base64 PNG small enough for a clipboard.
 */
export const MAX_CANVAS_SIDE = 16384;
export const MAX_CANVAS_AREA = 16_777_216;

export interface DiagramImageInput {
  /** Diagram extent in its own units (the SVG viewBox), padding included. */
  width: number;
  height: number;
  /** Typical label font size, in the same units. */
  fontPx: number;
}

export interface DiagramImageLimits {
  /** Requested on-page label size. */
  textPx: number;
  /** Widest the image may display in the target (CSS px). Infinity for a standalone PNG. */
  maxDisplayWidth: number;
  /** Widest the PNG may be, in CSS px; the pixel budget is twice this for retina. */
  maxRenderWidth: number;
}

export interface DiagramImagePlan {
  /** CSS px the image should occupy in the target. */
  displayWidth: number;
  displayHeight: number;
  /** PNG pixels per diagram unit. */
  pixelRatio: number;
  pixelWidth: number;
  pixelHeight: number;
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function planDiagramImage(input: DiagramImageInput, limits: DiagramImageLimits): DiagramImagePlan {
  // A NaN here would reach `canvas.width` and produce a blank PNG with no error.
  const width = positive(input.width, 1);
  const height = positive(input.height, 1);
  const fontPx = positive(input.fontPx, DEFAULT_DIAGRAM_FONT_PX);
  const textPx = positive(limits.textPx, COPY_IMAGE_TEXT_PX.normal);
  const maxDisplayWidth = positive(limits.maxDisplayWidth, Number.POSITIVE_INFINITY);
  const maxRenderPx = 2 * positive(limits.maxRenderWidth, MAX_CANVAS_SIDE);

  // The scale at which labels read at the requested size.
  const textScale = Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, textPx / fontPx));

  let pixelRatio = Math.max(2 * Math.min(textScale, maxDisplayWidth / width), textScale);
  pixelRatio = Math.min(
    pixelRatio,
    maxRenderPx / width,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_AREA / (width * height)),
  );

  // Never display larger than the pixels can back: a soft image is worse than a smaller one.
  const displayScale = Math.min(textScale, maxDisplayWidth / width, pixelRatio);

  return {
    displayWidth: Math.max(1, Math.round(width * displayScale)),
    displayHeight: Math.max(1, Math.round(height * displayScale)),
    pixelRatio,
    pixelWidth: Math.max(1, Math.round(width * pixelRatio)),
    pixelHeight: Math.max(1, Math.round(height * pixelRatio)),
  };
}

/** Median of the label sizes — robust to one oversized title. */
export function typicalFontPx(sizes: readonly number[]): number {
  const valid = sizes.filter((s) => Number.isFinite(s) && s > 0).sort((a, b) => a - b);
  if (valid.length === 0) return DEFAULT_DIAGRAM_FONT_PX;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}
