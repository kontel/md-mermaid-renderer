import html2canvas from 'html2canvas';
import { FLOWCHART_PADDING } from '../config/flowchart';
import { copyTargetProfile } from '../lib/copyTargets';
import type { CopyTarget, CopyTargetProfile } from '../lib/copyTargets';
import { diagramAltText, prepareDocument, styleDiagramFigure } from '../lib/copyDocument';
import { transformSvgForExport } from '../lib/svgExport';
import type { LabelWrapAggressiveness } from '../lib/svgExport';

// Re-exported so callers keep importing label helpers from one place.
export {
  escapeXml,
  decodeHtmlEntities,
  wrapSingleLineByWords,
  transformSvgForExport,
} from '../lib/svgExport';
export type { LabelWrapAggressiveness } from '../lib/svgExport';

export type CopyStrategy = 'auto' | 'svg-pipeline' | 'dom-capture';

/** A rendered diagram: the PNG plus the CSS-pixel size it should display at. */
export interface DiagramPng {
  dataUri: string;
  width: number;
  height: number;
}

/** Font size scale when copying/saving diagram images. */
export type CopyImageFontSize = 'small' | 'normal' | 'large';

const COPY_IMAGE_FONT_SCALE: Record<CopyImageFontSize, number> = {
  small: 0.95,
  normal: 1.15,
  large: 1.30,
};

/** Base font size (px) for "normal" in exported diagram images; Small/Large scale this. */
const COPY_IMAGE_BASE_FONT_PX = 14;

/** Export width range (CSS pixels). Small diagrams scale down to min; large cap at max. Exported for tests. */
export const MIN_PNG_WIDTH = 240;
export const MAX_PNG_WIDTH = 600;
/** Diagrams with intrinsic width above this are treated as "large" and allowed to grow past MAX_PNG_WIDTH. */
export const LARGE_DIAGRAM_THRESHOLD = 1400;
/** Hard cap for large/complex diagrams. Keeps PNGs manageable for clipboard/disk while staying legible. */
export const ABSOLUTE_MAX_PNG_WIDTH = 6000;

/**
 * Target export width from intrinsic diagram size.
 * - Tiny diagrams shrink toward MIN_PNG_WIDTH for tidy inline previews.
 * - Typical diagrams (up to ~1400px native) cap at MAX_PNG_WIDTH.
 * - Large/complex diagrams (e.g. wide grids, dense flows) scale up so labels stay readable,
 *   bounded by ABSOLUTE_MAX_PNG_WIDTH or the caller's tighter `maxRenderWidth`.
 */
export function targetExportWidth(
  intrinsicWidth: number,
  maxRenderWidth: number = ABSOLUTE_MAX_PNG_WIDTH,
): number {
  // A non-finite width would flow through to `canvas.width` and yield a blank
  // PNG with no error anywhere, so it is worth catching here.
  if (!Number.isFinite(intrinsicWidth) || intrinsicWidth <= 0) return MIN_PNG_WIDTH;

  const rawCap = Number.isFinite(maxRenderWidth) && maxRenderWidth > 0
    ? maxRenderWidth
    : ABSOLUTE_MAX_PNG_WIDTH;
  const cap = Math.min(ABSOLUTE_MAX_PNG_WIDTH, rawCap);

  if (intrinsicWidth < 380) {
    return Math.max(MIN_PNG_WIDTH, Math.round(intrinsicWidth * 0.72));
  }
  if (intrinsicWidth <= MAX_PNG_WIDTH) {
    return Math.round(intrinsicWidth * 0.88);
  }
  if (intrinsicWidth <= LARGE_DIAGRAM_THRESHOLD) {
    return MAX_PNG_WIDTH;
  }
  return Math.min(cap, Math.round(intrinsicWidth * 0.80));
}


function svgToPng(
  svgEl: SVGSVGElement,
  wrapAggressiveness: LabelWrapAggressiveness = 'normal',
  fontSize: CopyImageFontSize = 'normal',
  maxRenderWidth: number = ABSOLUTE_MAX_PNG_WIDTH,
): Promise<DiagramPng> {
  const fontScale = COPY_IMAGE_FONT_SCALE[fontSize];
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgEl);

  const bbox = svgEl.getBoundingClientRect();
  // Prefer viewBox: bbox is clamped by the container's CSS width, so large diagrams look
  // artificially small and get their labels crushed when exported.
  const vbWidth = svgEl.viewBox?.baseVal?.width || 0;
  const vbHeight = svgEl.viewBox?.baseVal?.height || 0;
  const intrinsicWidth = vbWidth || bbox.width || 800;
  const intrinsicHeight = vbHeight || bbox.height || 600;

  const width = targetExportWidth(intrinsicWidth, maxRenderWidth);
  const height = intrinsicHeight * (width / intrinsicWidth);

  const normalizedFontPx = Math.round(COPY_IMAGE_BASE_FONT_PX * fontScale * 10) / 10;

  svgString = transformSvgForExport(svgString, {
    fontPx: normalizedFontPx,
    wrapAggressiveness,
  });

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const pad = FLOWCHART_PADDING;
  const totalWidth = width + pad * 2;
  const totalHeight = height + pad * 2;

  return new Promise<DiagramPng>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = totalWidth * scale;
        canvas.height = totalHeight * scale;

        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(image, pad, pad, width, height);

        resolve({ dataUri: canvas.toDataURL('image/png'), width: totalWidth, height: totalHeight });
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG image load failed'));
    };
    image.src = url;
  });
}

// ---------------------------------------------------------------------------
// Strategy 2: DOM capture via html2canvas (pixel-perfect, slower)
// ---------------------------------------------------------------------------

async function domToPng(
  el: HTMLElement,
  maxRenderWidth: number = ABSOLUTE_MAX_PNG_WIDTH,
): Promise<DiagramPng> {
  const rect = el.getBoundingClientRect();
  const elWidth = rect.width || MAX_PNG_WIDTH;
  const targetW = targetExportWidth(elWidth, maxRenderWidth);
  const scale = (targetW / elWidth) * 2;

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale,
    logging: false,
    useCORS: true,
  });
  return {
    dataUri: canvas.toDataURL('image/png'),
    width: targetW,
    height: Math.round(rect.height * (targetW / elWidth)),
  };
}

// ---------------------------------------------------------------------------
// Container conversion — applies the chosen strategy per diagram
// ---------------------------------------------------------------------------

function replaceContainerWithImg(
  container: HTMLElement,
  png: DiagramPng,
  profile: CopyTargetProfile,
  index: number,
) {
  const img = document.createElement('img');
  img.src = png.dataUri;
  img.alt = diagramAltText(container, index);

  container.innerHTML = '';
  container.appendChild(img);
  styleDiagramFigure(container, img, profile, png.width);
}

async function convertContainer(
  liveContainer: HTMLElement,
  cloneContainer: HTMLElement,
  index: number,
  profile: CopyTargetProfile,
  strategy: CopyStrategy,
  wrapAggressiveness: LabelWrapAggressiveness,
  copyImageFontSize: CopyImageFontSize,
) {
  const liveSvg = liveContainer.querySelector<SVGSVGElement>(':scope > svg');
  const renderCap = profile.maxRenderWidth;

  if (strategy === 'dom-capture') {
    const png = await domToPng(liveContainer, renderCap);
    replaceContainerWithImg(cloneContainer, png, profile, index);
    return;
  }

  if (strategy === 'svg-pipeline') {
    if (!liveSvg) return;
    const png = await svgToPng(liveSvg, wrapAggressiveness, copyImageFontSize, renderCap);
    replaceContainerWithImg(cloneContainer, png, profile, index);
    return;
  }

  // "auto": try SVG pipeline first, fall back to DOM capture
  if (liveSvg) {
    try {
      const png = await svgToPng(liveSvg, wrapAggressiveness, copyImageFontSize, renderCap);
      replaceContainerWithImg(cloneContainer, png, profile, index);
      return;
    } catch {
      // SVG pipeline failed (likely foreignObject taint) — fall through
    }
  }

  try {
    const png = await domToPng(liveContainer, renderCap);
    replaceContainerWithImg(cloneContainer, png, profile, index);
  } catch {
    // leave as-is on total failure
  }
}

/** One diagram container → PNG data URI (SVG path then DOM fallback). */
export async function diagramToPngDataUri(
  container: HTMLElement,
  wrapAggressiveness: LabelWrapAggressiveness = 'normal',
  copyImageFontSize: CopyImageFontSize = 'normal',
): Promise<string> {
  const svgEl = container.querySelector<SVGSVGElement>(':scope > svg');
  if (svgEl) {
    try {
      return (await svgToPng(svgEl, wrapAggressiveness, copyImageFontSize)).dataUri;
    } catch {
      // fall through to DOM
    }
  }
  return (await domToPng(container)).dataUri;
}

function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Copy one diagram as PNG to clipboard. */
export async function copyDiagramToClipboard(
  container: HTMLElement,
  wrapAggressiveness: LabelWrapAggressiveness = 'normal',
  copyImageFontSize: CopyImageFontSize = 'normal',
): Promise<void> {
  const dataUri = await diagramToPngDataUri(container, wrapAggressiveness, copyImageFontSize);
  const blob = dataUriToBlob(dataUri);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** Save one diagram as PNG file. */
export async function saveDiagramAsFile(
  container: HTMLElement,
  filename = 'diagram.png',
  wrapAggressiveness: LabelWrapAggressiveness = 'normal',
  copyImageFontSize: CopyImageFontSize = 'normal',
): Promise<void> {
  const dataUri = await diagramToPngDataUri(container, wrapAggressiveness, copyImageFontSize);
  const blob = dataUriToBlob(dataUri);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface CopyPreviewOptions {
  /** Target system the HTML is being styled for. Defaults to generic rich text. */
  target?: CopyTarget;
  strategy?: CopyStrategy;
  wrapAggressiveness?: LabelWrapAggressiveness;
  copyImageFontSize?: CopyImageFontSize;
  /**
   * Markdown source behind the preview. Used verbatim as the `text/plain` flavor —
   * it is a far better plain-text rendering than scraping the DOM, which also drags
   * in the per-diagram Copy/Save button labels.
   */
  markdownSource?: string;
}

/** Build the HTML the target system will receive. Exported for tests. */
export async function buildTargetHtml(
  previewEl: HTMLElement,
  profile: CopyTargetProfile,
  strategy: CopyStrategy,
  wrapAggressiveness: LabelWrapAggressiveness,
  copyImageFontSize: CopyImageFontSize,
): Promise<string> {
  const clone = previewEl.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.diagram-actions, .mermaid-fallback-note').forEach((el) => el.remove());

  const liveContainers = previewEl.querySelectorAll<HTMLElement>('.mermaid-container');
  const cloneContainers = clone.querySelectorAll<HTMLElement>('.mermaid-container');

  for (let i = 0; i < liveContainers.length; i++) {
    await convertContainer(
      liveContainers[i],
      cloneContainers[i],
      i,
      profile,
      strategy,
      wrapAggressiveness,
      copyImageFontSize,
    );
  }

  // Style the markdown root itself, not the scroll container: `innerHTML` would
  // drop the outer element and take the base font and colour with it.
  const body = clone.querySelector<HTMLElement>('.markdown-body') ?? clone;
  prepareDocument(body, profile);

  return body === clone ? clone.innerHTML : body.outerHTML;
}

export async function copyPreview(
  previewEl: HTMLElement,
  options: CopyPreviewOptions = {},
): Promise<void> {
  const {
    target = 'rich',
    strategy = 'auto',
    wrapAggressiveness = 'normal',
    copyImageFontSize = 'normal',
    markdownSource,
  } = options;

  const profile = copyTargetProfile(target);
  const plainText = markdownSource ?? previewEl.innerText;

  if (!profile.emitsHtml) {
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/plain': new Blob([plainText], { type: 'text/plain' }) }),
    ]);
    return;
  }

  const html = await buildTargetHtml(previewEl, profile, strategy, wrapAggressiveness, copyImageFontSize);

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    }),
  ]);
}
