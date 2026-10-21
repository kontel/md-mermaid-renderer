import { describe, it, expect } from 'vitest';
import { liftClusterLabels } from './clusterLabels';

/** The shape mermaid emits for a flowchart with one subgraph. */
function flowchart(clusterTransform = ''): SVGSVGElement {
  const host = document.createElement('div');
  host.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg"><g><g class="root">' +
    '<g class="clusters">' +
    `<g class="cluster" ${clusterTransform}><rect x="0" y="0" width="200" height="100"/>` +
    '<g class="cluster-label" transform="translate(80, 5)"><foreignObject width="40" height="24"><div>Finish</div></foreignObject></g>' +
    '</g></g>' +
    '<g class="edges edgePaths"><path d="M0 0 L10 10"/></g>' +
    '<g class="edgeLabels"></g>' +
    '<g class="nodes"></g>' +
    '</g></g></svg>';
  return host.querySelector('svg')!;
}

function layerOrder(svg: SVGSVGElement): string[] {
  return [...svg.querySelector('g.root')!.children].map((c) => c.getAttribute('class') ?? '');
}

describe('liftClusterLabels', () => {
  it('paints subgraph titles after the edges', () => {
    const svg = flowchart();
    liftClusterLabels(svg);
    expect(layerOrder(svg)).toEqual(['clusters', 'edges edgePaths', 'cluster-labels', 'edgeLabels', 'nodes']);
    expect(svg.querySelector('.cluster-labels > .cluster-label')?.getAttribute('transform')).toBe('translate(80, 5)');
    expect(svg.querySelector('.cluster .cluster-label')).toBeNull();
  });

  it('is idempotent', () => {
    const svg = flowchart();
    liftClusterLabels(svg);
    liftClusterLabels(svg);
    expect(svg.querySelectorAll('.cluster-labels')).toHaveLength(1);
    expect(svg.querySelectorAll('.cluster-label')).toHaveLength(1);
  });

  it('leaves a title inside a transformed subgraph where it is', () => {
    const svg = flowchart('transform="translate(10, 10)"');
    liftClusterLabels(svg);
    expect(svg.querySelector('.cluster .cluster-label')).not.toBeNull();
    expect(svg.querySelector('.cluster-labels')).toBeNull();
  });

  it('ignores diagrams without subgraphs', () => {
    const host = document.createElement('div');
    host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><g class="nodes"></g></svg>';
    const svg = host.querySelector('svg')!;
    liftClusterLabels(svg);
    expect(svg.innerHTML).toBe('<g class="nodes"></g>');
  });
});
