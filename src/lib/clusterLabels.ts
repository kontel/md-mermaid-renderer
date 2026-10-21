/**
 * Keeps edges from striking through subgraph titles.
 *
 * mermaid paints each subgraph — box and title together — before any edge, so
 * an edge that enters a subgraph from above is drawn straight through its title.
 * Both layout engines (dagre and ELK) route that way; no config moves it.
 *
 * The fix is z-order: each title moves into a layer painted after the edge
 * paths, on a backing in its subgraph's own fill. An edge then passes *behind*
 * the title and reappears below it, the way hand-drawn diagrams handle it.
 *
 * Runs on the live SVG because the fill comes from mermaid's stylesheet, which
 * only computed style can resolve. The PNG export serialises the result, so a
 * copied diagram matches the preview.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Horizontal breathing room either side of the title text. */
const BACKING_PAD_X = 4;

function hasTransform(el: Element): boolean {
  return Boolean(el.getAttribute('transform')?.trim());
}

function isPaintable(fill: string): boolean {
  return Boolean(fill) && fill !== 'none' && fill !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(fill);
}

function addBacking(label: SVGGElement, fill: string): void {
  let box: DOMRect;
  try {
    box = label.getBBox();
  } catch {
    return; // not rendered (detached or display:none) — nothing to measure
  }
  if (!box.width || !box.height) return;

  const rect = label.ownerDocument.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('class', 'cluster-label-bg');
  rect.setAttribute('x', String(box.x - BACKING_PAD_X));
  rect.setAttribute('y', String(box.y));
  rect.setAttribute('width', String(box.width + BACKING_PAD_X * 2));
  rect.setAttribute('height', String(box.height));
  rect.setAttribute('rx', '2');
  // Inline style: mermaid's `.cluster rect` rule would otherwise restyle it.
  rect.setAttribute('style', `fill:${fill};stroke:none`);
  label.insertBefore(rect, label.firstChild);
}

/** Idempotent: titles already lifted are left where they are. */
export function liftClusterLabels(svg: SVGSVGElement): void {
  for (const clusters of svg.querySelectorAll<SVGGElement>('g.clusters')) {
    const root = clusters.parentElement;
    const edgePaths = root ? [...root.children].find((c) => c.classList.contains('edgePaths')) : undefined;
    // Moving a title across a transformed group would shift it.
    if (!root || !edgePaths || hasTransform(clusters)) continue;

    const layer = svg.ownerDocument.createElementNS(SVG_NS, 'g');
    layer.setAttribute('class', 'cluster-labels');

    for (const cluster of clusters.querySelectorAll<SVGGElement>(':scope > g.cluster')) {
      const label = cluster.querySelector<SVGGElement>(':scope > g.cluster-label');
      if (!label || hasTransform(cluster) || !label.textContent?.trim()) continue;

      const shape = cluster.querySelector(':scope > rect, :scope > path');
      const fill = shape ? getComputedStyle(shape).fill : '';
      if (isPaintable(fill)) addBacking(label, fill);
      layer.appendChild(label);
    }

    if (layer.childNodes.length > 0) edgePaths.after(layer);
  }
}
