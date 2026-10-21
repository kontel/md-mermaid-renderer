import html2canvas from 'html2canvas';
import { FLOWCHART_PADDING } from '../config/flowchart';
import { copyTargetProfile } from '../lib/copyTargets';
import type { CopyTarget, CopyTargetProfile } from '../lib/copyTargets';
import { diagramAltText, diagramFileName, prepareDocument, styleDiagramFigure } from '../lib/copyDocument';
import { COPY_IMAGE_TEXT_PX, planDiagramImage, typicalFontPx } from '../lib/diagramSizing';
import type { CopyImageFontSize, DiagramImageLimits } from '../lib/diagramSizing';
import { transformSvgForExport } from '../lib/svgExport';
import { diagramBackground, labelFontSizes, measureLabels } from './measureLabels';

// Re-exported so callers keep importing label helpers from one place.
export {
  escapeXml,
  decodeHtmlEntities,
  wrapSingleLineByWords,
  transformSvgForExport,
} from '../lib/svgExport';
export type { CopyImageFontSize } from '../lib/diagramSizing';

export type CopyStrategy = 'auto' | 'svg-pipeline' | 'dom-capture';

/** A rendered diagram: the PNG plus the CSS-pixel size it should display at. */
export interface DiagramPng {
  dataUri: string;
  width: number;
  height: number;
}

/** Limits for a standalone PNG (Copy/Save on one diagram): no page to fit into. */
function standaloneLimits(fontSize: CopyImageFontSize): DiagramImageLimits {
  return {
    textPx: COPY_IMAGE_TEXT_PX[fontSize],
    maxDisplayWidth: Number.POSITIVE_INFINITY,
    maxRenderWidth: Number.POSITIVE_INFINITY,
  };
}

function targetLimits(profile: CopyTargetProfile, fontSize: CopyImageFontSize): DiagramImageLimits {
  return {
    textPx: COPY_IMAGE_TEXT_PX[fontSize],
    maxDisplayWidth: profile.maxImageWidth,
    maxRenderWidth: profile.maxRenderWidth,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG image load failed'));
    image.src = url;
  });
}

/**
 * Rasterise a live diagram SVG.
 *
 * Labels are measured from the preview first so the PNG keeps mermaid's own
 * wrapping and fonts; only then is a copy rewritten for the canvas.
 */
async function svgToPng(
  svgEl: SVGSVGElement,
  container: HTMLElement,
  limits: DiagramImageLimits,
): Promise<DiagramPng> {
  const labels = measureLabels(svgEl);
  const fontPx = typicalFontPx(labelFontSizes(svgEl, labels));

  const viewBox = svgEl.viewBox.baseVal;
  const bbox = svgEl.getBoundingClientRect();
  // Prefer viewBox: the on-screen box is clamped by the pane, and a squeezed
  // diagram would otherwise export at its squeezed size.
  const width = viewBox?.width || bbox.width || 800;
  const height = viewBox?.height || bbox.height || 600;
  const pad = FLOWCHART_PADDING;
  const plan = planDiagramImage({ width: width + pad * 2, height: height + pad * 2, fontPx }, limits);

  // Give the copy an intrinsic size; `width="100%"` has nothing to resolve
  // against inside an <img>.
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.style.removeProperty('max-width');

  const svgString = transformSvgForExport(new XMLSerializer().serializeToString(clone), {
    fontPx,
    wrapAggressiveness: 'normal',
    labels,
  });

  const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = plan.pixelWidth;
    canvas.height = plan.pixelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = diagramBackground(svgEl, container);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(plan.pixelRatio, plan.pixelRatio);
    ctx.drawImage(image, pad, pad, width, height);
    return { dataUri: canvas.toDataURL('image/png'), width: plan.displayWidth, height: plan.displayHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: DOM capture via html2canvas (pixel-perfect, slower)
// ---------------------------------------------------------------------------

async function domToPng(el: HTMLElement, limits: DiagramImageLimits): Promise<DiagramPng> {
  const rect = el.getBoundingClientRect();
  const width = rect.width || 600;
  const height = rect.height || 400;
  // The capture is of what is on screen, so the text size that matters is the on-screen one.
  const svg = el.querySelector<SVGSVGElement>(':scope > svg');
  const viewBoxWidth = svg?.viewBox.baseVal?.width ?? 0;
  const onScreenScale = svg && viewBoxWidth ? svg.getBoundingClientRect().width / viewBoxWidth : 1;
  const fontPx = svg
    ? typicalFontPx(labelFontSizes(svg, measureLabels(svg))) * onScreenScale
    : parseFloat(getComputedStyle(el).fontSize);
  const plan = planDiagramImage({ width, height, fontPx }, limits);

  const canvas = await html2canvas(el, {
    backgroundColor: svg ? diagramBackground(svg, el) : '#ffffff',
    scale: plan.pixelRatio,
    logging: false,
    useCORS: true,
  });
  return { dataUri: canvas.toDataURL('image/png'), width: plan.displayWidth, height: plan.displayHeight };
}

/** One diagram container → PNG, by the chosen strategy ("auto": SVG, then DOM). */
async function diagramToPng(
  container: HTMLElement,
  limits: DiagramImageLimits,
  strategy: CopyStrategy = 'auto',
): Promise<DiagramPng> {
  const svg = container.querySelector<SVGSVGElement>(':scope > svg');
  if (strategy === 'dom-capture' || !svg) return domToPng(container, limits);
  if (strategy === 'svg-pipeline') return svgToPng(svg, container, limits);
  try {
    return await svgToPng(svg, container, limits);
  } catch {
    // e.g. a canvas the browser still considers tainted — capture the DOM instead.
    return domToPng(container, limits);
  }
}

function replaceContainerWithImg(container: HTMLElement, png: DiagramPng, profile: CopyTargetProfile, alt: string) {
  const img = document.createElement('img');
  img.src = png.dataUri;
  img.alt = alt;

  container.innerHTML = '';
  container.appendChild(img);
  styleDiagramFigure(container, img, profile, png.width, png.height);
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
  copyImageFontSize: CopyImageFontSize = 'normal',
): Promise<void> {
  // Hand the clipboard a promise rather than a finished blob: Safari drops the
  // user-gesture grant if the write starts only after a slow render.
  const blob = diagramToPng(container, standaloneLimits(copyImageFontSize)).then((png) =>
    dataUriToBlob(png.dataUri),
  );
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** Save one diagram as a PNG named after its heading. */
export async function saveDiagramAsFile(
  container: HTMLElement,
  copyImageFontSize: CopyImageFontSize = 'normal',
): Promise<void> {
  const png = await diagramToPng(container, standaloneLimits(copyImageFontSize));
  const url = URL.createObjectURL(dataUriToBlob(png.dataUri));
  const a = document.createElement('a');
  a.href = url;
  a.download = diagramFileName(container);
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
  copyImageFontSize: CopyImageFontSize,
): Promise<string> {
  const clone = previewEl.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.diagram-actions, .mermaid-fallback-note').forEach((el) => el.remove());

  const liveContainers = previewEl.querySelectorAll<HTMLElement>('.mermaid-container');
  const cloneContainers = clone.querySelectorAll<HTMLElement>('.mermaid-container');
  const limits = targetLimits(profile, copyImageFontSize);

  for (let i = 0; i < liveContainers.length; i++) {
    // Read before the SVG — with its title, description and labels — is replaced.
    const alt = diagramAltText(cloneContainers[i], i);
    try {
      const png = await diagramToPng(liveContainers[i], limits, strategy);
      replaceContainerWithImg(cloneContainers[i], png, profile, alt);
    } catch {
      // Leave this diagram as-is rather than lose the whole copy.
    }
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

  const html = await buildTargetHtml(previewEl, profile, strategy, copyImageFontSize);

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    }),
  ]);
}
