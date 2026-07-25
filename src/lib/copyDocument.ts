/**
 * Shapes a cloned preview DOM into HTML that survives paste into a target system.
 *
 * Everything here operates on a detached clone — never on the live preview — and
 * is pure enough to unit-test under jsdom.
 */

import type { CopyTargetProfile } from './copyTargets';

/** Classes Confluence should keep; everything else is presentational noise there. */
const KEEP_CLASS_PREFIX = 'language-';

/**
 * Marks diagram wrappers so their figure style can be re-applied after the rule
 * pass. Without it a retagged `<p>` wrapper picks up the profile's paragraph
 * margins and loses the spacing a figure needs. Removed before serialization.
 */
const FIGURE_MARKER = 'data-copy-figure';

/**
 * Parse an inline style string into declarations.
 *
 * Naive on purpose: values containing `;` (data URIs, for instance) are not
 * something the markdown body emits, and the profiles never produce them.
 */
export function parseStyleText(styleText: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of styleText.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const prop = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (prop && value) declarations.set(prop, value);
  }
  return declarations;
}

export function serializeStyle(declarations: Map<string, string>): string {
  return Array.from(declarations, ([prop, value]) => `${prop}:${value}`).join(';');
}

/**
 * Merge CSS text into an element's existing inline style, last write winning.
 *
 * Works on the style *attribute* rather than `el.style` so vendor properties the
 * CSSOM rejects — `mso-line-height-rule`, which Outlook needs — are preserved.
 */
export function mergeStyle(el: Element, cssText: string): void {
  if (!cssText) return;
  const declarations = parseStyleText(el.getAttribute('style') ?? '');
  for (const [prop, value] of parseStyleText(cssText)) {
    declarations.set(prop, value);
  }
  el.setAttribute('style', serializeStyle(declarations));
}

/** Apply a profile's root style plus its ordered selector rules. */
export function applyProfile(root: HTMLElement, profile: CopyTargetProfile): void {
  mergeStyle(root, profile.rootStyle);

  for (const [selector, css] of profile.rules) {
    for (const el of root.querySelectorAll(selector)) {
      mergeStyle(el, css);
    }
  }

  if (profile.zebraStripe) {
    for (const tr of root.querySelectorAll('tbody tr:nth-child(even), table > tr:nth-child(even)')) {
      mergeStyle(tr, profile.zebraStripe);
    }
  }
}

/** Outlook's Word engine ignores `border-collapse`; the old attributes still work. */
function applyTableAttributes(root: HTMLElement): void {
  for (const table of root.querySelectorAll('table')) {
    table.setAttribute('cellpadding', '0');
    table.setAttribute('cellspacing', '0');
    table.setAttribute('border', '0');
  }
}

/** Replace an element with one of a different tag, keeping children and style. */
function retag(el: Element, tag: string): Element {
  const replacement = el.ownerDocument.createElement(tag);
  const style = el.getAttribute('style');
  if (style) replacement.setAttribute('style', style);
  while (el.firstChild) replacement.appendChild(el.firstChild);
  el.replaceWith(replacement);
  return replacement;
}

/** Lift an element's children into its parent and drop the element itself. */
function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/**
 * Confluence flattens unknown nesting into empty paragraphs and discards classes,
 * so hand it plain blocks: diagram wrappers become paragraphs, layout divs go away,
 * and only `language-*` classes survive for the code macro.
 */
function normalizeForConfluence(root: HTMLElement): void {
  for (const container of root.querySelectorAll('.mermaid-container')) {
    retag(container, 'p');
  }
  for (const block of root.querySelectorAll('.mermaid-block')) {
    unwrap(block);
  }
  for (const el of root.querySelectorAll('[class]')) {
    const kept = Array.from(el.classList).filter((c) => c.startsWith(KEEP_CLASS_PREFIX));
    if (kept.length > 0) el.setAttribute('class', kept.join(' '));
    else el.removeAttribute('class');
  }
}

/**
 * Trim the outer margins so pasted content sits flush against whatever is
 * already in the document instead of opening with a stray blank line.
 */
function trimEdgeMargins(root: HTMLElement): void {
  const first = root.firstElementChild;
  const last = root.lastElementChild;
  if (first) mergeStyle(first, 'margin-top:0');
  if (last) mergeStyle(last, 'margin-bottom:0');
}

/** Full document pass: styles, then target-specific structure fixes. */
export function prepareDocument(root: HTMLElement, profile: CopyTargetProfile): void {
  applyProfile(root, profile);

  for (const figure of root.querySelectorAll(`[${FIGURE_MARKER}]`)) {
    mergeStyle(figure, profile.figure.style);
    figure.removeAttribute(FIGURE_MARKER);
  }

  if (profile.tableAttributes) applyTableAttributes(root);
  if (profile.structuralOnly) normalizeForConfluence(root);

  trimEdgeMargins(root);
}

/**
 * Style the wrapper that holds a diagram image and size the image for the target.
 *
 * The PNG stays high-resolution; `width` caps only how large it *displays*, which
 * is what keeps a 6000px flow chart from blowing out a 600px email body. Outlook
 * needs the `width` attribute — it ignores the CSS equivalent.
 */
export function styleDiagramFigure(
  container: HTMLElement,
  img: HTMLImageElement,
  profile: CopyTargetProfile,
  intrinsicWidth: number,
): HTMLElement {
  container.removeAttribute('style');
  container.setAttribute(FIGURE_MARKER, '');
  mergeStyle(container, profile.figure.style);

  const displayWidth = Math.max(1, Math.round(Math.min(profile.maxImageWidth, intrinsicWidth)));
  img.setAttribute('width', String(displayWidth));
  mergeStyle(img, 'max-width:100%;height:auto;border:0');

  if (profile.figure.tag === 'div') return container;

  const retagged = retag(container, profile.figure.tag) as HTMLElement;
  retagged.setAttribute(FIGURE_MARKER, '');
  return retagged;
}

/**
 * Alt text for a diagram image, taken from the nearest preceding heading.
 *
 * Email clients that block images show this instead, so it is the only thing a
 * recipient may ever see of the diagram.
 */
export function diagramAltText(container: Element, index: number): string {
  let node: Element | null = container;
  while (node) {
    let sibling: Element | null = node.previousElementSibling;
    while (sibling) {
      if (/^H[1-6]$/.test(sibling.tagName)) {
        const heading = sibling.textContent?.trim();
        if (heading) return `Diagram: ${heading}`;
      }
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return `Diagram ${index + 1}`;
}
