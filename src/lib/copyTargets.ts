/**
 * Copy targets — style profiles for pasting rendered Markdown + Mermaid into
 * other systems.
 *
 * Every target strips CSS differently, so the copied HTML has to carry its own
 * inline styles. A profile is pure data: a root style plus ordered
 * selector → CSS rules, applied later in `copyDocument.ts`.
 *
 * Rules are ordered; a later rule wins on the same declaration.
 */

export type CopyTarget = 'rich' | 'email' | 'confluence' | 'markdown';

export type StyleRule = readonly [selector: string, css: string];

export interface CopyTargetProfile {
  id: CopyTarget;
  label: string;
  /** One-line explanation shown next to the target picker. */
  hint: string;
  /** False for source-only targets: the clipboard gets `text/plain` and nothing else. */
  emitsHtml: boolean;
  /** Applied to the `.markdown-body` root so base font/colour survive serialization. */
  rootStyle: string;
  rules: readonly StyleRule[];
  /** Zebra striping CSS for even rows, or null where the target discards backgrounds. */
  zebraStripe: string | null;
  /** Display width cap (px) for diagram images. The PNG itself stays high-resolution. */
  maxImageWidth: number;
  /**
   * Cap on the rendered PNG width (CSS px, doubled again for retina). Trades detail
   * on zoom against payload size — a wide flow chart at full resolution is several
   * megabytes of base64, which is fine in a document and rude in an email.
   */
  maxRenderWidth: number;
  /** Wrapper around each diagram image. Confluence prefers a plain paragraph over a styled div. */
  figure: { tag: 'div' | 'p'; style: string };
  /** Add cellpadding/cellspacing/border attributes — Outlook's Word engine ignores CSS on tables. */
  tableAttributes: boolean;
  /** Drop presentational classes and unwrap layout divs; the target re-styles everything itself. */
  structuralOnly: boolean;
}

const RICH_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const RICH_MONO = "'Fira Code', Consolas, Monaco, monospace";

/** Outlook renders with Word, which only sees locally installed fonts. */
const EMAIL_SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const EMAIL_MONO = "Consolas, 'Courier New', Courier, monospace";

const CONFLUENCE_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const CONFLUENCE_MONO = "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace";

// ---------------------------------------------------------------------------
// Rich text — Google Docs, Word, Slack, anything that keeps CSS
// ---------------------------------------------------------------------------

const RICH: CopyTargetProfile = {
  id: 'rich',
  label: 'Rich text',
  hint: 'Google Docs, Word, Slack — keeps the app’s look.',
  emitsHtml: true,
  rootStyle: `color:#24292e;font-family:${RICH_SANS};font-size:16px;line-height:1.65`,
  rules: [
    ['p', 'margin:0 0 16px;line-height:1.65'],
    ['h1, h2, h3, h4, h5, h6', 'margin:28px 0 12px;font-weight:600;line-height:1.25;color:#1a1a2e'],
    ['h1', 'font-size:30px;border-bottom:1px solid #eaecef;padding-bottom:8px'],
    ['h2', 'font-size:24px;border-bottom:1px solid #eaecef;padding-bottom:6px'],
    ['h3', 'font-size:20px'],
    ['h4', 'font-size:17px'],
    ['ul, ol', 'margin:0 0 16px;padding-left:28px'],
    ['li', 'margin:0 0 6px;line-height:1.65'],
    ['li > ul, li > ol', 'margin:6px 0 0'],
    ['blockquote', 'margin:0 0 16px;padding:2px 0 2px 16px;border-left:4px solid #dfe2e5;color:#6a737d'],
    ['hr', 'border:0;border-top:1px solid #e1e4e8;height:1px;margin:28px 0'],
    ['a', 'color:#0366d6;text-decoration:underline'],
    ['table', 'border-collapse:collapse;width:100%;margin:0 0 20px;font-size:14px'],
    ['th, td', 'padding:8px 12px;border:1px solid #dfe2e5;text-align:left;vertical-align:top'],
    ['th', 'background-color:#f6f8fa;font-weight:600'],
    [
      '.code-block',
      `background-color:#282c34;color:#abb2bf;padding:14px 16px;margin:0 0 16px;border-radius:6px;` +
        `font-family:${RICH_MONO};font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word`,
    ],
    ['.code-block code', 'background:none;padding:0;color:inherit;font-family:inherit;font-size:inherit'],
    [
      '.inline-code',
      `background-color:#f1f2f4;padding:2px 5px;border-radius:3px;font-family:${RICH_MONO};font-size:13px;color:#24292e`,
    ],
    [
      '.mermaid-ascii',
      `background-color:#1a1a2e;color:#eaeaea;border:1px solid #0f3460;border-radius:6px;padding:14px 16px;` +
        `margin:0 0 16px;font-family:${RICH_MONO};font-size:12px;line-height:1.4;white-space:pre;overflow-x:auto`,
    ],
    [
      '.mermaid-error',
      'background-color:#ffeef0;border:1px solid #f97583;border-radius:6px;padding:12px 16px;margin:0 0 16px;color:#cb2431;font-size:14px',
    ],
    ['img', 'max-width:100%;height:auto;border:0'],
  ],
  zebraStripe: 'background-color:#f6f8fa',
  maxImageWidth: 760,
  // Matches ABSOLUTE_MAX_PNG_WIDTH: documents can carry the detail.
  maxRenderWidth: 6000,
  figure: {
    tag: 'div',
    style:
      'display:block;text-align:center;margin:20px 0;padding:12px;background-color:#ffffff;border:1px solid #e1e4e8;border-radius:6px',
  },
  tableAttributes: false,
  structuralOnly: false,
};

// ---------------------------------------------------------------------------
// Email — Gmail, Outlook, Apple Mail
// ---------------------------------------------------------------------------

/**
 * Email choices that differ from rich text, and why:
 * - Light code blocks: clients that force dark mode invert backgrounds, which turns
 *   a dark block into unreadable light-on-light.
 * - `mso-line-height-rule:exactly` — Word ignores fractional line-height without it.
 * - 600px image cap: the widest a message body reliably renders without horizontal scroll.
 * - Web-safe monospace: Fira Code is not installed on the recipient's machine.
 */
const EMAIL: CopyTargetProfile = {
  id: 'email',
  label: 'Email',
  hint: 'Gmail, Outlook — web-safe fonts, light code, 600px images.',
  emitsHtml: true,
  rootStyle:
    `color:#24292e;font-family:${EMAIL_SANS};font-size:15px;line-height:1.65;` +
    `-webkit-text-size-adjust:100%;mso-line-height-rule:exactly`,
  rules: [
    ['p', 'margin:0 0 16px;line-height:1.65;mso-line-height-rule:exactly'],
    ['h1, h2, h3, h4, h5, h6', 'margin:30px 0 12px;font-weight:700;line-height:1.3;color:#111827'],
    ['h1', 'font-size:24px;border-bottom:1px solid #e5e7eb;padding-bottom:8px'],
    ['h2', 'font-size:20px;border-bottom:1px solid #e5e7eb;padding-bottom:6px'],
    ['h3', 'font-size:17px'],
    ['h4, h5, h6', 'font-size:15px'],
    ['ul, ol', 'margin:0 0 16px;padding-left:26px'],
    ['li', 'margin:0 0 8px;line-height:1.6'],
    ['li > ul, li > ol', 'margin:8px 0 0'],
    ['blockquote', 'margin:0 0 16px;padding:2px 0 2px 16px;border-left:3px solid #d0d7de;color:#57606a'],
    ['hr', 'border:0;border-top:1px solid #e5e7eb;height:1px;line-height:1px;margin:28px 0'],
    ['a', 'color:#0b5fff;text-decoration:underline'],
    ['strong, b', 'font-weight:700'],
    ['table', 'border-collapse:collapse;width:100%;margin:0 0 20px;font-size:14px;mso-table-lspace:0;mso-table-rspace:0'],
    ['th, td', 'padding:9px 12px;border:1px solid #d0d7de;text-align:left;vertical-align:top'],
    ['th', 'background-color:#f6f8fa;font-weight:700'],
    [
      '.code-block',
      `background-color:#f6f8fa;color:#24292e;border:1px solid #d0d7de;border-radius:6px;padding:14px 16px;` +
        `margin:0 0 16px;font-family:${EMAIL_MONO};font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word`,
    ],
    ['.code-block code', 'background:none;padding:0;color:inherit;font-family:inherit;font-size:inherit'],
    [
      '.inline-code',
      `background-color:#f0f2f5;border:1px solid #e3e6ea;padding:1px 5px;border-radius:4px;` +
        `font-family:${EMAIL_MONO};font-size:13px;color:#24292e`,
    ],
    [
      '.mermaid-ascii',
      `background-color:#f6f8fa;color:#24292e;border:1px solid #d0d7de;border-radius:6px;padding:14px 16px;` +
        `margin:0 0 16px;font-family:${EMAIL_MONO};font-size:12px;line-height:1.4;white-space:pre;overflow-x:auto`,
    ],
    [
      '.mermaid-error',
      'background-color:#fff5f5;border:1px solid #f97583;border-radius:6px;padding:12px 16px;margin:0 0 16px;color:#cb2431;font-size:14px',
    ],
    ['img', 'max-width:100%;height:auto;border:0;outline:none;display:block;margin:0 auto;-ms-interpolation-mode:bicubic'],
  ],
  zebraStripe: 'background-color:#f9fafb',
  maxImageWidth: 600,
  // 4× the display width: still sharp when the recipient opens the image, but a
  // fraction of the base64 a full-resolution render would attach to the message.
  maxRenderWidth: 2400,
  figure: {
    tag: 'div',
    style:
      'display:block;text-align:center;margin:22px 0;padding:14px;background-color:#ffffff;border:1px solid #e1e4e8;border-radius:6px',
  },
  tableAttributes: true,
  structuralOnly: false,
};

// ---------------------------------------------------------------------------
// Confluence — the editor discards most CSS and re-styles by tag
// ---------------------------------------------------------------------------

/**
 * Confluence keeps structure (headings, lists, tables, `<pre>`, images) and throws
 * away nearly all inline CSS, so this profile stays deliberately thin: no
 * backgrounds, no borders, no widths that would fight the page theme. Layout divs
 * are unwrapped because Confluence turns stray nesting into empty paragraphs.
 * The `language-*` class on `<code>` is preserved — that is what the code macro
 * reads to pick a highlighter.
 */
const CONFLUENCE: CopyTargetProfile = {
  id: 'confluence',
  label: 'Confluence',
  hint: 'Atlassian editor — structural HTML it won’t mangle.',
  emitsHtml: true,
  rootStyle: `color:#172b4d;font-family:${CONFLUENCE_SANS};font-size:14px;line-height:1.6`,
  rules: [
    ['p', 'margin:0 0 12px;line-height:1.6'],
    ['h1, h2, h3, h4, h5, h6', 'margin:24px 0 8px;font-weight:600;line-height:1.3;color:#172b4d'],
    ['h1', 'font-size:24px'],
    ['h2', 'font-size:20px'],
    ['h3', 'font-size:16px'],
    ['ul, ol', 'margin:0 0 12px;padding-left:24px'],
    ['li', 'margin:0 0 4px;line-height:1.6'],
    ['blockquote', 'margin:0 0 12px;padding-left:16px;border-left:3px solid #dfe1e6;color:#5e6c84'],
    ['hr', 'border:0;border-top:1px solid #dfe1e6;height:1px;margin:24px 0'],
    ['a', 'color:#0052cc'],
    ['table', 'border-collapse:collapse;margin:0 0 16px'],
    ['th, td', 'padding:8px 10px;border:1px solid #dfe1e6;text-align:left;vertical-align:top'],
    ['th', 'font-weight:600'],
    [
      '.code-block',
      `margin:0 0 16px;padding:12px;font-family:${CONFLUENCE_MONO};font-size:13px;line-height:1.5;` +
        'white-space:pre-wrap;word-break:break-word',
    ],
    ['.code-block code', 'font-family:inherit;font-size:inherit'],
    ['.inline-code', `font-family:${CONFLUENCE_MONO};font-size:13px`],
    [
      '.mermaid-ascii',
      `margin:0 0 16px;padding:12px;font-family:${CONFLUENCE_MONO};font-size:12px;line-height:1.4;white-space:pre`,
    ],
    ['.mermaid-error', 'margin:0 0 12px;color:#bf2600'],
    ['img', 'max-width:100%;height:auto'],
  ],
  zebraStripe: null,
  maxImageWidth: 680,
  maxRenderWidth: 3600,
  figure: { tag: 'p', style: 'text-align:center;margin:16px 0' },
  tableAttributes: false,
  structuralOnly: true,
};

// ---------------------------------------------------------------------------
// Markdown source — GitHub, Notion, chat, anywhere that parses Markdown itself
// ---------------------------------------------------------------------------

const MARKDOWN: CopyTargetProfile = {
  id: 'markdown',
  label: 'Markdown source',
  hint: 'GitHub, Notion — raw text with ```mermaid fences.',
  emitsHtml: false,
  rootStyle: '',
  rules: [],
  zebraStripe: null,
  maxImageWidth: 0,
  maxRenderWidth: 0,
  figure: { tag: 'div', style: '' },
  tableAttributes: false,
  structuralOnly: false,
};

export const COPY_TARGET_PROFILES: Record<CopyTarget, CopyTargetProfile> = {
  rich: RICH,
  email: EMAIL,
  confluence: CONFLUENCE,
  markdown: MARKDOWN,
};

/** Picker order. */
export const COPY_TARGETS: readonly CopyTarget[] = ['rich', 'email', 'confluence', 'markdown'];

export function isValidCopyTarget(value: string | null): value is CopyTarget {
  return value !== null && Object.hasOwn(COPY_TARGET_PROFILES, value);
}

export function copyTargetProfile(target: CopyTarget): CopyTargetProfile {
  return COPY_TARGET_PROFILES[target];
}
