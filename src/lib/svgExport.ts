/**
 * Rewrites a rendered mermaid SVG into one a canvas will accept.
 *
 * mermaid draws HTML labels inside `<foreignObject>`. Drawing an SVG that
 * contains a foreignObject onto a canvas taints it, so `toDataURL` throws and
 * the PNG export fails. This module swaps every foreignObject for native SVG
 * `<text>`, which means re-implementing the parts of HTML layout that mattered:
 * line breaks, wrapping, and centring.
 *
 * Pure string in, string out — the regex work here is fiddly enough to deserve
 * direct tests rather than only being exercised through a canvas.
 */

export type LabelWrapAggressiveness = 'compact' | 'normal' | 'wide';

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Decode HTML entities so "Setup &amp; init" becomes "Setup & init" before we
 * re-escape for SVG. Numeric forms are included because a label can carry them
 * through from the markdown source.
 *
 * `&amp;` is decoded last: doing it first would turn `&amp;lt;` into `<`
 * instead of the literal `&lt;` the author wrote.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => codePointOrEmpty(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => codePointOrEmpty(parseInt(dec, 10)))
    .replace(/&amp;/gi, '&');
}

function codePointOrEmpty(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * Wrap a line to a character budget.
 *
 * A word longer than the budget is hard-broken rather than left to overflow —
 * an unbroken identifier or URL in a node label used to run straight out of the
 * shape in the exported PNG.
 */
export function wrapSingleLineByWords(line: string, maxCharsPerLine: number): string[] {
  const limit = Math.max(1, Math.floor(maxCharsPerLine));
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const result: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      result.push(current);
      current = '';
    }
  };

  for (const word of words) {
    if (word.length > limit) {
      flush();
      for (let i = 0; i < word.length; i += limit) {
        result.push(word.slice(i, i + limit));
      }
      // Keep appending to the tail so a following short word can share the line.
      current = result.pop() ?? '';
      continue;
    }

    if (!current) {
      current = word;
      continue;
    }

    if (current.length + 1 + word.length <= limit) {
      current += ` ${word}`;
      continue;
    }

    flush();
    current = word;
  }

  flush();
  return result;
}

const WRAP_MULTIPLIER: Record<LabelWrapAggressiveness, number> = {
  compact: 0.85,
  normal: 1.15,
  wide: 1.35,
};

export function autoWrapLinesByBoxWidth(
  lines: string[],
  boxWidthPx: number,
  fontSizePx: number,
  wrapAggressiveness: LabelWrapAggressiveness,
): string[] {
  const avgCharWidth = Math.max(5, fontSizePx * 0.56);
  const baseChars = Math.max(12, Math.floor((boxWidthPx - 12) / avgCharWidth));
  const maxCharsPerLine = Math.max(12, Math.floor(baseChars * WRAP_MULTIPLIER[wrapAggressiveness]));

  // Wide boxes need no help; leave the author's own line breaks alone. Long
  // unbroken words are still split, since those overflow at any box width.
  if (maxCharsPerLine >= 80) {
    return lines.flatMap((line) =>
      line.length > maxCharsPerLine ? wrapSingleLineByWords(line, maxCharsPerLine) : [line],
    );
  }

  const wrapped: string[] = [];
  for (const line of lines) {
    if (line.length <= maxCharsPerLine) {
      wrapped.push(line);
      continue;
    }
    wrapped.push(...wrapSingleLineByWords(line, maxCharsPerLine));
  }
  return wrapped;
}

export interface SvgExportOptions {
  /** Uniform font size (px) applied to every label in the export. */
  fontPx: number;
  wrapAggressiveness: LabelWrapAggressiveness;
}

function attr(attrs: string, name: string): number {
  return parseFloat(new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] || '0');
}

/**
 * Swap `<foreignObject>` labels for `<text>`, strip the label backing rects that
 * would otherwise double up as borders, and normalise font sizes.
 */
export function transformSvgForExport(svgString: string, options: SvgExportOptions): string {
  const { fontPx, wrapAggressiveness } = options;
  let out = svgString;

  if (!out.includes('xmlns=')) {
    out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  out = out.replace(
    /<foreignObject([^>]*)>([\s\S]*?)<\/foreignObject>/gi,
    (_match, attrs: string, inner: string, offset: number, fullString: string) => {
      const x = attr(attrs, 'x');
      const y = attr(attrs, 'y');
      const w = attr(attrs, 'width');
      const h = attr(attrs, 'height');

      // `<br>` becomes a newline before tags are stripped, so authored line
      // breaks survive; everything else collapses to plain text.
      const withNewlines = inner
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();
      if (!withNewlines) return '';

      let lines = withNewlines
        .split(/\n/)
        .map((s) => decodeHtmlEntities(s.trim()))
        .filter(Boolean);
      if (lines.length === 0) return '';

      const baseFontSize = (h / Math.max(1, lines.length)) * 0.52;
      const estimatedFontSize = Math.max(12, Math.min(17, baseFontSize));
      lines = autoWrapLinesByBoxWidth(lines, w, estimatedFontSize, wrapAggressiveness);
      if (lines.length === 0) return '';

      const cx = x + w / 2;
      const cy = y + h / 2;
      const lineHeight = fontPx * 1.2;
      const totalHeight = (lines.length - 1) * lineHeight;
      const startY = cy - totalHeight / 2 + fontPx * 0.35;

      const tspans = lines
        .map(
          (line, i) =>
            `<tspan x="${cx}" dy="${i === 0 ? 0 : lineHeight}" text-anchor="middle">${escapeXml(line)}</tspan>`,
        )
        .join('');

      const textEl = `<text x="${cx}" y="${startY}" font-family="arial, sans-serif" font-size="${fontPx}">${tspans}</text>`;

      // Look only at a tight window around this foreignObject. A broad scan
      // misclassifies nearby node labels — notably the first node — and adds a
      // rect that reads as a double border.
      const around = fullString.slice(
        Math.max(0, offset - 160),
        Math.min(fullString.length, offset + 160),
      );
      if (!/class="[^"]*edgeLabel[^"]*"/i.test(around)) return textEl;

      const pad = 5;
      const r = x - pad;
      const ry = y - pad;
      const rw = w + pad * 2;
      const rh = h + pad * 2;
      const whiteBacker = `<rect x="${r}" y="${ry}" width="${rw}" height="${rh}" fill="#ffffff" fill-opacity="1" rx="6" ry="6"/>`;
      const styledRect = `<rect x="${r}" y="${ry}" width="${rw}" height="${rh}" fill="#f6f8fa" fill-opacity="1" stroke="#e0e0e0" stroke-width="1" rx="6" ry="6"/>`;
      return `<g opacity="1">${whiteBacker}${styledRect}${textEl}</g>`;
    },
  );

  // Drop the node label backing rect that would show as a second border.
  out = out.replace(
    /(<g[^>]*class="(?![^"]*edgeLabel)[^"]*\blabel\b[^"]*"[^>]*>)([\s\S]*?)(<\/g>)/gi,
    (_match, open: string, body: string, close: string) => {
      const cleanedBody = body.replace(/<rect\b[^>]*\/>\s*|<rect\b[^>]*>\s*<\/rect>\s*/gi, '');
      return `${open}${cleanedBody}${close}`;
    },
  );

  // One size for node labels, edge labels and subgraph titles alike. Matches the
  // attribute form only; CSS `font-size:` inside <style> is left alone.
  out = out.replace(/\bfont-size="(\d+(?:\.\d+)?)(px)?"/gi, () => `font-size="${fontPx}"`);

  return out;
}
