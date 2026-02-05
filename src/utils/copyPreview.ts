import html2canvas from 'html2canvas';

export type CopyStrategy = 'auto' | 'svg-pipeline' | 'dom-capture';

/** Max width (in CSS pixels, before retina scaling) for generated PNGs. */
const MAX_PNG_WIDTH = 600;

// Hoisted regex patterns for SVG processing
const FOREIGN_OBJECT_RE = /<foreignObject([^>]*)>([\s\S]*?)<\/foreignObject>/gi;
const HTML_TAG_RE = /<[^>]*>/g;
const ATTR_X_RE = /\bx="([^"]*)"/;
const ATTR_Y_RE = /\by="([^"]*)"/;
const ATTR_WIDTH_RE = /\bwidth="([^"]*)"/;
const ATTR_HEIGHT_RE = /\bheight="([^"]*)"/;

const INLINE_STYLES: Record<string, Record<string, string>> = {
  '.markdown-body': {
    color: '#24292e',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    fontSize: '16px',
    lineHeight: '1.6',
  },
  'h1, h2, h3, h4, h5, h6': {
    fontWeight: '600',
    lineHeight: '1.25',
    color: '#1a1a2e',
  },
  h1: { fontSize: '2em', borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' },
  h2: { fontSize: '1.5em', borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' },
  h3: { fontSize: '1.25em' },
  table: { borderCollapse: 'collapse', width: '100%' },
  'th, td': { padding: '0.5em 1em', border: '1px solid #dfe2e5' },
  th: { backgroundColor: '#f6f8fa', fontWeight: '600' },
  '.code-block': {
    backgroundColor: '#282c34',
    color: '#abb2bf',
    padding: '1em',
    borderRadius: '6px',
    fontFamily: "'Fira Code', Consolas, Monaco, monospace",
    fontSize: '0.9em',
    lineHeight: '1.5',
    whiteSpace: 'pre',
    overflowX: 'auto',
  },
  '.inline-code': {
    backgroundColor: 'rgba(27, 31, 35, 0.05)',
    padding: '0.2em 0.4em',
    borderRadius: '3px',
    fontFamily: "'Fira Code', Consolas, Monaco, monospace",
    fontSize: '0.9em',
  },
  '.mermaid-ascii': {
    backgroundColor: '#1a1a2e',
    color: '#eaeaea',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    fontFamily: "'Fira Code', Consolas, Monaco, monospace",
    fontSize: '0.85em',
    lineHeight: '1.4',
    padding: '1em',
    whiteSpace: 'pre',
  },
  '.mermaid-error': {
    backgroundColor: '#ffeef0',
    border: '1px solid #f97583',
    borderRadius: '6px',
    padding: '1em',
    color: '#cb2431',
    fontSize: '0.9em',
  },
};

function applyInlineStyles(root: HTMLElement) {
  for (const [selector, styles] of Object.entries(INLINE_STYLES)) {
    const elements = selector === '.markdown-body'
      ? [root]
      : root.querySelectorAll<HTMLElement>(selector);

    for (const el of elements) {
      for (const [prop, val] of Object.entries(styles)) {
        el.style[prop as any] = val;
      }
    }
  }

  root.querySelectorAll<HTMLElement>('tr:nth-child(even)').forEach((tr) => {
    tr.style.backgroundColor = '#f6f8fa';
  });
}

// ---------------------------------------------------------------------------
// Strategy 1: SVG → Image → Canvas (fast, but foreignObject causes taint)
// ---------------------------------------------------------------------------

function svgToPngDataUri(svgEl: SVGSVGElement): Promise<string> {
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgEl);

  const bbox = svgEl.getBoundingClientRect();
  let width = bbox.width || svgEl.viewBox?.baseVal?.width || 800;
  let height = bbox.height || svgEl.viewBox?.baseVal?.height || 600;

  // Clamp to max width, scaling height proportionally
  if (width > MAX_PNG_WIDTH) {
    height = height * (MAX_PNG_WIDTH / width);
    width = MAX_PNG_WIDTH;
  }

  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Replace foreignObject with SVG text to avoid canvas taint.
  svgString = svgString.replace(
    FOREIGN_OBJECT_RE,
    (_match, attrs: string, inner: string) => {
      const textContent = inner.replace(HTML_TAG_RE, '').trim();
      if (!textContent) return '';

      const x = parseFloat(ATTR_X_RE.exec(attrs)?.[1] || '0');
      const y = parseFloat(ATTR_Y_RE.exec(attrs)?.[1] || '0');
      const w = parseFloat(ATTR_WIDTH_RE.exec(attrs)?.[1] || '0');
      const h = parseFloat(ATTR_HEIGHT_RE.exec(attrs)?.[1] || '0');

      const cx = x + w / 2;
      const cy = y + h / 2;
      const fontSize = Math.max(10, Math.min(14, h * 0.45));

      return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="arial, sans-serif" font-size="${fontSize}">${textContent}</text>`;
    },
  );

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL('image/png'));
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

async function domToPngDataUri(el: HTMLElement): Promise<string> {
  const rect = el.getBoundingClientRect();
  const elWidth = rect.width || MAX_PNG_WIDTH;
  // Scale down if the element is wider than the cap
  const scale = elWidth > MAX_PNG_WIDTH ? (MAX_PNG_WIDTH / elWidth) * 2 : 2;

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale,
    logging: false,
    useCORS: true,
  });
  return canvas.toDataURL('image/png');
}

// ---------------------------------------------------------------------------
// Container conversion — applies the chosen strategy per diagram
// ---------------------------------------------------------------------------

function replaceContainerWithImg(container: HTMLElement, pngDataUri: string) {
  const img = document.createElement('img');
  img.src = pngDataUri;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';

  container.innerHTML = '';
  container.style.display = 'block';
  container.style.textAlign = 'center';
  container.style.margin = '1.5em 0';
  container.style.padding = '1em';
  container.style.backgroundColor = '#fff';
  container.style.border = '1px solid #e1e4e8';
  container.style.borderRadius = '6px';
  container.appendChild(img);
}

async function convertContainer(
  liveContainer: HTMLElement,
  cloneContainer: HTMLElement,
  strategy: CopyStrategy,
) {
  const liveSvg = liveContainer.querySelector<SVGSVGElement>(':scope > svg');

  if (strategy === 'dom-capture') {
    const png = await domToPngDataUri(liveContainer);
    replaceContainerWithImg(cloneContainer, png);
    return;
  }

  if (strategy === 'svg-pipeline') {
    if (!liveSvg) return;
    const png = await svgToPngDataUri(liveSvg);
    replaceContainerWithImg(cloneContainer, png);
    return;
  }

  // "auto": try SVG pipeline first, fall back to DOM capture
  if (liveSvg) {
    try {
      const png = await svgToPngDataUri(liveSvg);
      replaceContainerWithImg(cloneContainer, png);
      return;
    } catch {
      // SVG pipeline failed (likely foreignObject taint) — fall through
    }
  }

  try {
    const png = await domToPngDataUri(liveContainer);
    replaceContainerWithImg(cloneContainer, png);
  } catch {
    // leave as-is on total failure
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function copyPreview(
  previewEl: HTMLElement,
  strategy: CopyStrategy = 'auto',
): Promise<void> {
  const clone = previewEl.cloneNode(true) as HTMLElement;

  const liveContainers = previewEl.querySelectorAll<HTMLElement>('.mermaid-container');
  const cloneContainers = clone.querySelectorAll<HTMLElement>('.mermaid-container');

  await Promise.all(
    Array.from(liveContainers).map((live, i) =>
      convertContainer(live, cloneContainers[i], strategy)
    )
  );

  applyInlineStyles(clone);

  const html = clone.innerHTML;
  const plainText = previewEl.innerText;

  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([plainText], { type: 'text/plain' });

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    }),
  ]);
}
