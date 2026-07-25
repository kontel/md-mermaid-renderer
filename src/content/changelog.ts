/**
 * Release notes shown once per version in a dismissible card.
 *
 * Bump `CHANGELOG_VERSION` when there is something worth interrupting someone
 * for. The dismissal is stored per version, so a bump re-shows the card once and
 * an unchanged version stays quiet forever.
 */

export const CHANGELOG_VERSION = '2026.07.25';

export interface ChangelogEntry {
  /** Emoji used as the bullet marker. */
  icon: string;
  title: string;
  body: string;
}

export const CHANGELOG_TITLE = "What's new";

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    icon: '🎨',
    title: '15 diagram styles',
    body: 'Neo, Redux and four hand-tuned Studio palettes, plus editable design tokens. Open the style panel from the header — it sits beside the preview so you can see each one land.',
  },
  {
    icon: '📋',
    title: 'Copy for where you are pasting',
    body: 'Pick Email, Confluence, Rich text or Markdown before copying. Each carries its own fonts, spacing and image sizing so the paste lands looking right.',
  },
  {
    icon: '📐',
    title: 'Mermaid 11.16',
    body: 'Venn, Ishikawa, TreeView, Wardley, Cynefin, swimlanes and railroad diagrams — with 35 worked examples across the Gallery, Charts and New in v11 tabs.',
  },
  {
    icon: '🩹',
    title: 'Fewer broken renders',
    body: 'Newer diagram types no longer fail on a cold load, and the Beautiful and ASCII renderers fall back to mermaid.js instead of showing an error.',
  },
];
