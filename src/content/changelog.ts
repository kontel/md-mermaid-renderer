/**
 * Release notes shown once per version in a dismissible card.
 *
 * Bump `CHANGELOG_VERSION` when there is something worth interrupting someone
 * for. The dismissal is stored per version, so a bump re-shows the card once and
 * an unchanged version stays quiet forever.
 */

export const CHANGELOG_VERSION = '2026.10.21';

export interface ChangelogEntry {
  /** Emoji used as the bullet marker. */
  icon: string;
  title: string;
  body: string;
}

export const CHANGELOG_TITLE = "What's new";

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    icon: '📐',
    title: 'Mermaid 12 with ELK layout',
    body: 'Flowcharts, state, class and ER diagrams now use ELK, which keeps edge labels off other edges and nodes. Prefer the old shapes? Set layout: dagre in a diagram’s front-matter config.',
  },
  {
    icon: '🏷️',
    title: 'Labels stay put',
    body: 'Edges pass behind subgraph titles instead of striking through them, and copied images keep the exact fonts and line breaks you see in the preview.',
  },
  {
    icon: '🔍',
    title: 'Actual size for big diagrams',
    body: 'When a diagram is squeezed too small to read, an “Actual size” button lets you view it 1:1 and scroll.',
  },
  {
    icon: '📋',
    title: 'Smarter copied images',
    body: 'Email and Confluence images are sized from each diagram’s own text, stay sharp when opened full size, and carry alt text naming the diagram and its steps.',
  },
];
