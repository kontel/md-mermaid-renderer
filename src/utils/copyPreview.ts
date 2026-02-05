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

  // Inline striped table rows
  root.querySelectorAll<HTMLElement>('tr:nth-child(even)').forEach((tr) => {
    tr.style.backgroundColor = '#f6f8fa';
  });
}

async function svgToPngDataUri(svgEl: SVGSVGElement): Promise<string> {
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgEl);

  // Ensure the SVG has explicit dimensions for the canvas
  const bbox = svgEl.getBoundingClientRect();
  const width = bbox.width || svgEl.viewBox?.baseVal?.width || 800;
  const height = bbox.height || svgEl.viewBox?.baseVal?.height || 600;

  // Add xmlns if missing
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const scale = 2; // 2x for retina-quality output
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copyPreview(previewEl: HTMLElement): Promise<void> {
  // Clone the preview DOM so we can mutate it without affecting the page
  const clone = previewEl.cloneNode(true) as HTMLElement;

  // We need the SVGs from the *live* DOM (clone won't have computed dimensions)
  // So we convert from live SVGs, then inject PNGs into the clone
  const liveSvgs = previewEl.querySelectorAll<SVGSVGElement>('.mermaid-container svg');
  const cloneContainers = clone.querySelectorAll<HTMLElement>('.mermaid-container');

  for (let i = 0; i < liveSvgs.length && i < cloneContainers.length; i++) {
    try {
      const pngDataUri = await svgToPngDataUri(liveSvgs[i]);
      const img = document.createElement('img');
      img.src = pngDataUri;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';

      const container = cloneContainers[i];
      container.innerHTML = '';
      container.style.display = 'block';
      container.style.textAlign = 'center';
      container.style.margin = '1.5em 0';
      container.style.padding = '1em';
      container.style.backgroundColor = '#fff';
      container.style.border = '1px solid #e1e4e8';
      container.style.borderRadius = '6px';
      container.appendChild(img);
    } catch {
      // leave as-is on failure
    }
  }

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
