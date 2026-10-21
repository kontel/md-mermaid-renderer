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

/** Marks generated spacer paragraphs so they are not doubled up. */
const SPACER_MARKER = 'data-copy-spacer';

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
function applyTableAttributes(root: HTMLElement, outlookCompat: boolean): void {
  for (const table of root.querySelectorAll('table')) {
    table.setAttribute('cellpadding', '0');
    table.setAttribute('cellspacing', '0');
    table.setAttribute('border', '0');

    if (!outlookCompat) continue;
    // Word frequently drops `width:100%` from CSS but honours the attribute.
    if (/width:\s*100%/.test(table.getAttribute('style') ?? '')) {
      table.setAttribute('width', '100%');
    }
    // Deliberately no align="left" here: in HTML that *floats* the table, so
    // whatever follows wraps alongside it instead of clearing it. Block-level
    // and left-aligned is already the default. Only the figure wrapper opts into
    // align="center", which centres rather than floats.
  }
}

/**
 * Mirror inline `background-color` onto `bgcolor`.
 *
 * Word's support for CSS backgrounds on table rows and cells is patchy, so the
 * legacy attribute is what actually paints. Only opaque hex colours transfer;
 * `bgcolor` cannot express anything else.
 */
function mirrorBackgroundsToAttribute(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('tr, td, th, table')) {
    const colour = /background-color:\s*(#[0-9a-f]{3,8})/i.exec(el.getAttribute('style') ?? '')?.[1];
    if (colour) el.setAttribute('bgcolor', colour);
  }
}

/**
 * Re-house each diagram figure in a table.
 *
 * Word applies padding and borders to `<div>` inconsistently and ignores
 * `margin:0 auto` on images, so the centred, bordered card degrades into a
 * left-aligned image with no frame. A single-cell table is the one container it
 * lays out predictably.
 */
function wrapFiguresInTables(root: HTMLElement, cellStyle: string): void {
  for (const figure of root.querySelectorAll<HTMLElement>(`[${FIGURE_MARKER}]`)) {
    const doc = figure.ownerDocument;
    const table = doc.createElement('table');
    table.setAttribute('cellpadding', '0');
    table.setAttribute('cellspacing', '0');
    table.setAttribute('border', '0');
    table.setAttribute('align', 'center');
    mergeStyle(
      table,
      'border-collapse:collapse;margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;' +
        'mso-table-lspace:0;mso-table-rspace:0',
    );

    const tbody = doc.createElement('tbody');
    const tr = doc.createElement('tr');
    const td = doc.createElement('td');
    td.setAttribute('align', 'center');
    mergeStyle(td, cellStyle);

    while (figure.firstChild) td.appendChild(figure.firstChild);
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    figure.replaceWith(table);
  }
}

/**
 * Put an empty paragraph either side of every table.
 *
 * Word ignores `margin` on `<table>` outright, so a diagram card or data table
 * ends up flush against the paragraphs around it. An empty paragraph is the one
 * vertical gap Word always honours. Sized in pt and marked so the spacers can be
 * recognised again.
 */
function insertTableSpacers(root: HTMLElement, gapPt: number): void {
  const doc = root.ownerDocument;
  const makeSpacer = () => {
    const spacer = doc.createElement('p');
    spacer.setAttribute(SPACER_MARKER, '');
    spacer.setAttribute(
      'style',
      `margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;` +
        `mso-margin-top-alt:0;mso-margin-bottom-alt:0;` +
        `font-size:${gapPt}pt;line-height:${gapPt}pt;mso-line-height-rule:exactly`,
    );
    // A bare empty paragraph is collapsed by several clients; nbsp survives.
    spacer.innerHTML = '&nbsp;';
    return spacer;
  };

  for (const table of root.querySelectorAll('table')) {
    // Only outermost tables: a nested one is already inside a spaced block.
    if (table.parentElement?.closest('table')) continue;
    const before = table.previousElementSibling;
    if (!before?.hasAttribute(SPACER_MARKER)) table.before(makeSpacer());
    const after = table.nextElementSibling;
    if (!after?.hasAttribute(SPACER_MARKER)) table.after(makeSpacer());
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
  const children = [...root.children].filter((el) => !el.hasAttribute(SPACER_MARKER));
  const first = children[0];
  const last = children[children.length - 1];
  if (first) mergeStyle(first, 'margin-top:0');
  if (last) mergeStyle(last, 'margin-bottom:0');
}

/** Full document pass: styles, then target-specific structure fixes. */
export function prepareDocument(root: HTMLElement, profile: CopyTargetProfile): void {
  applyProfile(root, profile);

  // Re-apply the figure style after the rule pass, then let the Outlook path
  // consume the markers before they are cleared — the wrapper needs to find them.
  for (const figure of root.querySelectorAll(`[${FIGURE_MARKER}]`)) {
    mergeStyle(figure, profile.figure.style);
  }

  if (profile.outlookCompat) {
    wrapFiguresInTables(root, profile.figureCellStyle ?? '');
  }

  for (const figure of root.querySelectorAll(`[${FIGURE_MARKER}]`)) {
    figure.removeAttribute(FIGURE_MARKER);
  }
  if (profile.tableAttributes) applyTableAttributes(root, profile.outlookCompat);
  if (profile.outlookCompat) {
    mirrorBackgroundsToAttribute(root);
    insertTableSpacers(root, 6);
  }
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
  intrinsicHeight = 0,
): HTMLElement {
  container.removeAttribute('style');
  container.setAttribute(FIGURE_MARKER, '');
  mergeStyle(container, profile.figure.style);

  const displayWidth = Math.max(1, Math.round(Math.min(profile.maxImageWidth, intrinsicWidth)));
  img.setAttribute('width', String(displayWidth));
  mergeStyle(img, 'max-width:100%;height:auto;border:0');

  if (profile.outlookCompat) {
    // Word ignores `max-width` and scales attribute-less images by the system
    // DPI, so both dimensions have to be stated outright.
    const ratio = intrinsicHeight > 0 && intrinsicWidth > 0 ? intrinsicHeight / intrinsicWidth : 0;
    if (ratio > 0) {
      const displayHeight = Math.max(1, Math.round(displayWidth * ratio));
      img.setAttribute('height', String(displayHeight));
      mergeStyle(img, `width:${displayWidth}px;height:${displayHeight}px`);
    } else {
      mergeStyle(img, `width:${displayWidth}px`);
    }
  }

  if (profile.figure.tag === 'div') return container;

  const retagged = retag(container, profile.figure.tag) as HTMLElement;
  retagged.setAttribute(FIGURE_MARKER, '');
  return retagged;
}

/** Nearest heading above `container` in document order, walking out of wrappers. */
function precedingHeading(container: Element): string | null {
  let node: Element | null = container;
  while (node) {
    let sibling: Element | null = node.previousElementSibling;
    while (sibling) {
      if (/^H[1-6]$/.test(sibling.tagName)) {
        const heading = sibling.textContent?.trim();
        if (heading) return heading;
      }
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return null;
}

/** mermaid's `aria-roledescription` values that don't read well when humanised. */
const DIAGRAM_KIND_NAMES: Record<string, string> = {
  'flowchart-v2': 'Flowchart',
  flowchart: 'Flowchart',
  er: 'Entity relationship diagram',
  sequence: 'Sequence diagram',
  class: 'Class diagram',
  c4: 'C4 diagram',
  xychart: 'XY chart',
  railroadEbnf: 'Railroad diagram',
};

/** "quadrantChart" → "Quadrant chart". */
function diagramKind(svg: Element | null): string {
  const raw = svg?.getAttribute('aria-roledescription')?.trim();
  if (!raw || raw === 'null') return 'Diagram';
  if (DIAGRAM_KIND_NAMES[raw]) return DIAGRAM_KIND_NAMES[raw];
  const words = raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]v\d+$/, '').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Longest alt text worth reading aloud; past this a screen reader user skips it. */
const MAX_ALT_LENGTH = 240;

/**
 * A node's visible label. Text nodes are joined with spaces because a `<br>`
 * contributes nothing to `textContent` ("working?<br>test" would read
 * "working?test"). A class box contributes its name, not every member.
 */
function nodeLabel(node: Element): string {
  const source = node.querySelector('.label-group') ?? node;
  const walker = node.ownerDocument.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let text = walker.nextNode(); text; text = walker.nextNode()) parts.push(text.textContent ?? '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Alt text for a diagram image.
 *
 * An author's own `accTitle` / `accDescr` wins — mermaid writes them to the
 * SVG's `<title>` and `<desc>`. Otherwise the alt names the kind of diagram,
 * the section it sits in, and the first node labels, so it says what the
 * diagram is about rather than only that one exists. Email clients that block
 * images show this instead, so it may be all a recipient ever sees.
 */
export function diagramAltText(container: Element, index: number): string {
  const svg = container.querySelector('svg');
  const title = svg?.querySelector(':scope > title')?.textContent?.trim();
  const desc = svg?.querySelector(':scope > desc')?.textContent?.trim();

  let alt: string;
  if (title || desc) {
    alt = [title, desc].filter(Boolean).join('. ');
  } else {
    const heading = precedingHeading(container);
    const kind = diagramKind(svg ?? null);
    alt = heading ? `${kind}: ${heading}` : `${kind} ${index + 1}`;

    const labels = [...new Set([...(svg?.querySelectorAll('g.node') ?? [])].map(nodeLabel).filter(Boolean))];
    if (labels.length > 0) alt += ` — ${labels.join(', ')}`;
  }

  return alt.length > MAX_ALT_LENGTH ? `${alt.slice(0, MAX_ALT_LENGTH - 1).trimEnd()}…` : alt;
}

/** "Flowchart Example" → "flowchart-example.png"; the alt title when there is no heading. */
export function diagramFileName(container: Element): string {
  const title = container.querySelector('svg > title')?.textContent?.trim();
  const base = (title || precedingHeading(container) || 'diagram')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'diagram'}.png`;
}
