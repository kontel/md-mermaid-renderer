/**
 * Reads mermaid's HTML labels back out of the live DOM, exactly as laid out.
 *
 * Needs real layout, so it only runs in a browser; jsdom has none. The pure half
 * — turning these measurements into SVG — lives in lib/svgExport.ts.
 */

import type { MeasuredBox, MeasuredLabel, MeasuredLine } from '../lib/svgExport';

interface Word {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function isTransparent(color: string): boolean {
  return !color || color === 'transparent' || /rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(color);
}

/** Every word of the label with its on-screen box, split by layout line. */
function collectWords(root: Element): Word[] {
  const words: Word[] = [];
  const range = root.ownerDocument.createRange();
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    for (const match of text.matchAll(/\S+/g)) {
      const start = match.index;
      range.setStart(node, start);
      range.setEnd(node, start + match[0].length);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 || r.height > 0);
      if (rects.length === 1) {
        const r = rects[0];
        words.push({ text: match[0], left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        continue;
      }
      // A word broken across lines (overflow-wrap): fall back to per-character.
      for (let i = 0; i < match[0].length; i++) {
        range.setStart(node, start + i);
        range.setEnd(node, start + i + 1);
        const r = range.getClientRects()[0];
        if (r) words.push({ text: match[0][i], left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
    }
  }
  return words;
}

/**
 * Group words into lines by vertical position. Words on one line share a top
 * edge to within a fraction of the line's height; a new line starts lower.
 */
function groupLines(words: Word[], tolerance: number): Word[][] {
  const lines: Word[][] = [];
  for (const word of words) {
    const line = lines.find((l) => Math.abs(l[0].top - word.top) <= tolerance);
    if (!line) {
      lines.push([word]);
      continue;
    }
    // Per-character fragments of a broken word join without a space.
    const prev = line[line.length - 1];
    if (word.left - prev.right < 0.5 && prev.text.length === 1 && word.text.length === 1) {
      prev.text += word.text;
      prev.right = word.right;
    } else {
      line.push(word);
    }
  }
  return lines.sort((a, b) => a[0].top - b[0].top);
}

function measureLabel(fo: SVGForeignObjectElement): MeasuredLabel | null {
  const box = fo.getBoundingClientRect();
  const unitWidth = fo.width.baseVal.value;
  if (!unitWidth || !box.width) return null; // hidden or collapsed: let the estimate handle it
  const scale = box.width / unitWidth;

  const words = collectWords(fo);
  if (words.length === 0) return { lines: [], fontPx: 0, fontFamily: '', fontWeight: '', fontStyle: '', color: '', backgrounds: [] };

  const firstText = fo.ownerDocument.createTreeWalker(fo, NodeFilter.SHOW_TEXT);
  let textParent: Element | null = null;
  for (let n = firstText.nextNode(); n; n = firstText.nextNode()) {
    if (n.textContent?.trim()) {
      textParent = n.parentElement;
      break;
    }
  }
  if (!textParent) return null;
  const style = getComputedStyle(textParent);
  const fontPx = parseFloat(style.fontSize);
  if (!fontPx) return null;

  const lines: MeasuredLine[] = groupLines(words, fontPx * scale * 0.5).map((line) => {
    const left = Math.min(...line.map((w) => w.left));
    const right = Math.max(...line.map((w) => w.right));
    const top = Math.min(...line.map((w) => w.top));
    const bottom = Math.max(...line.map((w) => w.bottom));
    return {
      text: line.map((w) => w.text).join(' '),
      cx: ((left + right) / 2 - box.left) / scale,
      cy: ((top + bottom) / 2 - box.top) / scale,
    };
  });

  const backgrounds: MeasuredBox[] = [];
  for (const el of fo.querySelectorAll('*')) {
    const color = getComputedStyle(el).backgroundColor;
    if (isTransparent(color)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    backgrounds.push({
      x: (r.left - box.left) / scale,
      y: (r.top - box.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
      color,
    });
  }

  return {
    lines,
    fontPx,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    backgrounds,
  };
}

/** Measurements for every foreignObject in `svg`, in document order. */
export function measureLabels(svg: SVGSVGElement): (MeasuredLabel | null)[] {
  return [...svg.querySelectorAll('foreignObject')].map((fo) => measureLabel(fo));
}

/**
 * Label font sizes across the diagram, in viewBox units — HTML labels and native
 * `<text>` alike, so charts without foreignObjects are covered too.
 */
export function labelFontSizes(svg: SVGSVGElement, labels: readonly (MeasuredLabel | null)[]): number[] {
  const sizes = labels.flatMap((l) => (l && l.lines.length > 0 ? [l.fontPx] : []));
  for (const text of svg.querySelectorAll('text')) {
    if (!text.textContent?.trim()) continue;
    const size = parseFloat(getComputedStyle(text).fontSize);
    if (size) sizes.push(size);
  }
  return sizes;
}

/** The colour the preview actually paints behind the diagram. */
export function diagramBackground(svg: SVGSVGElement, container: Element): string {
  for (const el of [svg, container]) {
    const color = getComputedStyle(el).backgroundColor;
    if (!isTransparent(color)) return color;
  }
  return '#ffffff';
}
